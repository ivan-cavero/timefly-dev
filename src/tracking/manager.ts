import type * as vscode from 'vscode'
import { getStorageService } from '@/services/storage'
import { statusBar } from '@/components/statusBar'
import { logger } from '@/utils/logger'
import { initLanguageCollector } from './collectors/coding/language'
import { initTypingCollector } from './collectors/coding/typing'
import { initSessionCollector } from './collectors/debugging/session'
import { initFileWatcherCollector } from './collectors/fs/watcher'
import { initActiveEditorCollector } from './collectors/ide/active_editor'
import { initGitCollector } from './collectors/metadata/git'
import { processCodingActivity } from './activities/coding'
import { processDebuggingActivity } from './activities/debugging'
import { processReadingActivity } from './activities/reading'
import { createPulse, storePulse, syncPulses } from './pulse'
import { getCurrentActivities, initStateManager } from './state'
import { ActivityName, type Activity } from '@/types/tracking'

const PULSE_INTERVAL_MS = 5000 // 5 seconds
const SYNC_INTERVAL_MS = 1000 * 60 * 30 // 30 minutes

let pulseInterval: NodeJS.Timeout | undefined
let syncInterval: NodeJS.Timeout | undefined
let isTracking = false

/**
 * Initializes all data collectors and the state manager.
 */
const initializeSystems = async (context: vscode.ExtensionContext) => {
	// State
	initStateManager()
	// Activity collectors
	initTypingCollector(context)
	initLanguageCollector(context)
	initSessionCollector(context)
	initActiveEditorCollector(context)
	initFileWatcherCollector(context)
	// Metadata collectors
	await initGitCollector()

	logger.info('All tracking systems initialized.')
}

/**
 * Updates and stores the total tracked time from concurrent activities.
 */
const updateTrackingStats = async (activities: Set<ActivityName>) => {
	const storage = getStorageService()
	const stats = storage.getStats() ?? {
		total_coding_ms: 0,
		total_reading_ms: 0,
		total_debugging_ms: 0,
		last_updated: ''
	}

	// For now, we only add time for "active" states
	if (activities.has(ActivityName.CODING)) {
		stats.total_coding_ms += PULSE_INTERVAL_MS
	}
	if (activities.has(ActivityName.READING)) {
		stats.total_reading_ms += PULSE_INTERVAL_MS
	}
	if (activities.has(ActivityName.DEBUGGING)) {
		stats.total_debugging_ms += PULSE_INTERVAL_MS
	}

	stats.last_updated = new Date().toISOString()
	await storage.storeStats(stats)
	statusBar.updateStats(stats)
}

/**
 * Gets the current activities from the state manager and builds a pulse.
 */
const runPulseCheck = async () => {
	if (!isTracking) {
		return
	}

	const activeStates = getCurrentActivities()
	const pulseActivities: Activity[] = []

	// For each active state, process its corresponding activity data.
	if (activeStates.has(ActivityName.CODING)) {
		const activity = processCodingActivity(PULSE_INTERVAL_MS)
		if (activity) {
			pulseActivities.push(activity)
		}
	}
	if (activeStates.has(ActivityName.READING)) {
		const activity = processReadingActivity(PULSE_INTERVAL_MS)
		if (activity) {
			pulseActivities.push(activity)
		}
	}
	if (activeStates.has(ActivityName.DEBUGGING)) {
		const activity = processDebuggingActivity(PULSE_INTERVAL_MS)
		// Debugging always has data if the state is active
		pulseActivities.push(activity)
	}

	// Always update stats, even for IDLE/INACTIVE in the future
	await updateTrackingStats(activeStates)

	// Only create a pulse if there was a "real" activity
	if (pulseActivities.length > 0) {
		const pulse = await createPulse(pulseActivities)
		if (pulse) {
			await storePulse(pulse)
		}
	}
}

/**
 * Starts the tracking manager.
 */
export const startTracking = async (context: vscode.ExtensionContext) => {
	if (isTracking) {
		logger.warn('Tracking is already running.')
		return
	}

	await initializeSystems(context)

	pulseInterval = setInterval(runPulseCheck, PULSE_INTERVAL_MS)
	syncInterval = setInterval(syncPulses, SYNC_INTERVAL_MS)

	const initialStats = getStorageService().getStats()
	if (initialStats) {
		statusBar.updateStats(initialStats)
	}

	isTracking = true
	logger.info('TimeFly tracking manager started.')
}

/**
 * Stops the tracking manager.
 */
export const stopTracking = () => {
	if (!isTracking) {
		logger.warn('Tracking is not running.')
		return
	}

	if (pulseInterval) {
		clearInterval(pulseInterval)
	}
	if (syncInterval) {
		clearInterval(syncInterval)
	}

	pulseInterval = undefined
	syncInterval = undefined

	syncPulses().catch((err) => {
		logger.error('Final sync failed on stop.', err)
	})

	isTracking = false
	logger.info('TimeFly tracking manager stopped.')
} 