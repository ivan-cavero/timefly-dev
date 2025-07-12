import * as vscode from 'vscode'
import { randomUUID } from 'crypto'
import { performance } from 'perf_hooks'
import { statusBar } from '@/components/statusBar'
import { StatusBarState } from '@/types/statusBar'
import { logger } from '@/utils/logger'
import type { StorageService } from '@/services/storage'
import { analytics } from '@/services/analytics'
import {
	IDLE_THRESHOLD,
	INACTIVE_THRESHOLD,
	PULSE_GENERATION_INTERVAL,
	DETECTOR_DEBOUNCE_MS,
	SYNC_INTERVAL
} from './constants'
import { ACTIVITY_PRIORITY, PRODUCTIVE_ACTIVITIES, type ActivityName } from './activities'
import { registerAllDetectors } from './detectors'
import type { ActivityMetadata, ActivityEvent } from './types'
import { mergeMeta } from '@/tracking/utils/meta'

// Debug buffer accessible via getBufferedEvents()
const _events: ActivityEvent[] = []

export const getBufferedEvents = (): ActivityEvent[] => [..._events]

interface TrackerHandle {
	dispose: () => void
}

// Utility helpers --------------------------------------------------
const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1)

const getHighestPriorityActivity = (activities: Set<ActivityName>): ActivityName | undefined => {
	let top: ActivityName | undefined
	let bestScore = Number.MAX_SAFE_INTEGER
	activities.forEach((name) => {
		const score = ACTIVITY_PRIORITY[name]
		if (score < bestScore) {
			bestScore = score
			top = name
		}
	})
	return top
}

const formatDuration = (ms: number): string => {
	const totalSeconds = Math.floor(ms / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	return `${hours}h ${minutes}m`
}

// Main entry -------------------------------------------------------
export const startTracking = (
	context: vscode.ExtensionContext,
	storage: StorageService
): TrackerHandle => {
	// State ---------------------------------------------------------
	let lastUserActivity = performance.now()
	const activeActivities = new Set<ActivityName>()
	const activityMeta = new Map<ActivityName, ActivityMetadata>()
	const firstSeen = new Map<ActivityName, number>()
	const lastSeen = new Map<ActivityName, number>()
	const lastTrigger = new Map<ActivityName, number>()
	let windowStart = performance.now()
	// Load today's productive time from storage
	const todayDate = new Date()
	let dailyProductiveMs = storage.getProductiveTime(todayDate)
	const disposables: vscode.Disposable[] = []

	// Events stash (to be flushed later via sync) -------------------
	const events = _events

	// ---------------------------------------------------------------
	// Internal helpers
	const recordActivity = (activity: ActivityName, meta: ActivityMetadata = {}): void => {
		const now = performance.now()
		lastUserActivity = now

		// Debounce
		const prev = lastTrigger.get(activity) ?? Number.NEGATIVE_INFINITY
		if (now - prev < DETECTOR_DEBOUNCE_MS) {
			// Still merge meta and lastSeen but skip rest
			lastSeen.set(activity, now)
			const existing = activityMeta.get(activity) ?? {}
			activityMeta.set(activity, mergeMeta(existing, meta))
			return
		}
		lastTrigger.set(activity, now)

		if (!firstSeen.has(activity)) {
			firstSeen.set(activity, now)
		}
		lastSeen.set(activity, now)

		// Remove inactivity markers if actual user action occurs
		if (activity !== 'idle' && activity !== 'inactive') {
			activeActivities.delete('idle')
			activeActivities.delete('inactive')
		}
		activeActivities.add(activity)

		// Merge metadata
		const existing = activityMeta.get(activity) ?? {}
		activityMeta.set(activity, mergeMeta(existing, meta))
	}

	const handleIdleChecks = (): void => {
		const now = performance.now()
		const diff = now - lastUserActivity

		// Already marked as inactive, nothing to do
		if (activeActivities.has('inactive')) {
			return
		}

		if (diff >= IDLE_THRESHOLD + INACTIVE_THRESHOLD) {
			activeActivities.clear()
			activeActivities.add('inactive')
			logger.info('User became INACTIVE')
		} else if (diff >= IDLE_THRESHOLD) {
			if (!activeActivities.has('idle')) {
				activeActivities.clear()
				activeActivities.add('idle')
				logger.info('User became IDLE')
			}
		}
	}

	const updateStatusBar = (): void => {
		if (activeActivities.size === 0) {
			return
		}

		const topActivity = getHighestPriorityActivity(activeActivities)
		if (!topActivity) {
			return
		}

		let text: string

		const base = `${formatDuration(dailyProductiveMs)} `

		if (activeActivities.size > 1) {
			text = `${capitalize(topActivity)} + ${activeActivities.size - 1} more`
		} else {
			text = capitalize(topActivity)
		}

		statusBar.update(StatusBarState.AUTHENTICATED, `$(watch) ${base}${text}`)
	}

	const generateEvent = (): void => {
		if (activeActivities.size === 0) {
			return
		}

		const userInfo = storage.getUserInfo()
		if (!userInfo) {
			return
		}

		const nowDate = new Date()

		// Calculate per-activity durations
		const activityEntries = Array.from(activeActivities).map((name) => {
			const start = firstSeen.get(name) ?? windowStart
			const end = lastSeen.get(name) ?? performance.now()
			let dur = end - start
			if (dur < 0) {
				dur = 0
			}
			if (dur > PULSE_GENERATION_INTERVAL) {
				dur = PULSE_GENERATION_INTERVAL
			}
			return {
				name,
				duration_ms: Math.round(dur),
				properties: activityMeta.get(name) ?? {}
			}
		})

		// Ensure total duration ≤ window
		const totalDur = activityEntries.reduce((sum, a) => sum + a.duration_ms, 0)
		if (totalDur === 0) {
			// No meaningful activity in this window – skip generating event
			return
		}

		if (totalDur > PULSE_GENERATION_INTERVAL) {
			const scale = PULSE_GENERATION_INTERVAL / totalDur
			for (const a of activityEntries) {
				a.duration_ms = Math.round(a.duration_ms * scale)
			}
		}

		// Accumulate productive time
		let addedProductive = 0
		for (const a of activityEntries) {
			if ((PRODUCTIVE_ACTIVITIES as readonly ActivityName[]).includes(a.name)) {
				addedProductive += a.duration_ms
			}
		}
		dailyProductiveMs += addedProductive
		// Persist
		void storage.storeProductiveTime(todayDate, dailyProductiveMs)
		// update statusBar immediately
		updateStatusBar()

		const event: ActivityEvent = {
			event_id: randomUUID(),
			user_id: userInfo.uuid,
			project_id: vscode.workspace.name ?? 'unknown',
			event_time: nowDate.toISOString(),
			metadata: {
				extension_version: context.extension.packageJSON.version ?? 'unknown',
				ide_name: vscode.env.appName,
				platform: process.platform
			},
			activities: activityEntries
		}

		events.push(event)
		logger.debug('Event generated', event)

		// reset meta for next window
		activityMeta.clear()
		firstSeen.clear()
		lastSeen.clear()
		lastTrigger.clear()
		windowStart = performance.now()
	}

	// ---------------------------------------------------------------
	// Activity sources are handled through modular detectors below.

	// Register detectors (they will call recordActivity)
	registerAllDetectors(context, recordActivity)

	// Timers --------------------------------------------------------
	const idleChecker = setInterval(() => {
		handleIdleChecks()
		updateStatusBar()
	}, 1_000)

	const eventTimer = setInterval(() => {
		generateEvent()
	}, PULSE_GENERATION_INTERVAL)

	// Flush to backend every SYNC_INTERVAL
	const flushEvents = (reason: 'interval' | 'shutdown'): void => {
		if (events.length === 0) {
			return
		}

		// TODO: replace with real network call
		logger.info(`Flushing ${events.length} events to backend (stub)`)

		// Track flush metrics via analytics if available
		if (analytics.isEnabled()) {
			void analytics.track({
				name: 'events_flushed',
				properties: {
					count: events.length,
					reason,
					timestamp: new Date().toISOString()
				}
			})
		}

		// After successful send, clear buffer
		events.length = 0
	}

	const syncTimer = setInterval(() => flushEvents('interval'), SYNC_INTERVAL)

	// Expose dispose method ----------------------------------------
	const dispose = (): void => {
		disposables.forEach((d) => d.dispose())
		clearInterval(idleChecker)
		clearInterval(eventTimer)
		clearInterval(syncTimer)

		// Ensure pending events are flushed before dispose
		flushEvents('shutdown')
	}

	// Register dispose with extension context so it's cleaned up automatically
	context.subscriptions.push({ dispose })

	// Start in IDLE state until user action
	activeActivities.add('idle')
	firstSeen.set('idle', windowStart)
	lastSeen.set('idle', windowStart)
	updateStatusBar()

	logger.info('Activity tracking started')

	return { dispose }
} 