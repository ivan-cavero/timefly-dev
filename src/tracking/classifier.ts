/**
 * The Activity Classifier processes raw events and determines the user's current activity.
 *
 * Responsibilities:
 * - Receive raw events from collectors.
 * - Apply rules to classify events into activities (e.g., 'coding', 'reading').
 * - Manage activity state, including transitions and expirations (idle/inactive).
 * - Handle simultaneous activities.
 */ 

import { logger } from '@/utils/logger'
import { ACTIVITY_EXPIRATION_THRESHOLD, IDLE_THRESHOLD, INACTIVE_THRESHOLD } from './constants'
import type { ActiveActivity, ActivityName, RawEvent } from './types'

export type ActivityClassifier = ReturnType<typeof createActivityClassifier>

const createActivityClassifier = () => {
	let activeActivities: ActiveActivity[] = []
	let lastEventTimestamp = Date.now()

	const updateActivity = (name: ActivityName, properties: Record<string, string> = {}) => {
		lastEventTimestamp = Date.now()
		const existingActivity = activeActivities.find(a => a.name === name)

		if (existingActivity) {
			existingActivity.lastEventAt = lastEventTimestamp
			existingActivity.properties = { ...existingActivity.properties, ...properties }
		} else {
			logger.debug(`Starting new activity: ${name}`)
			activeActivities.push({
				name,
				startedAt: lastEventTimestamp,
				lastEventAt: lastEventTimestamp,
				properties
			})
		}
	}

	const processEvent = (event: RawEvent) => {
		logger.debug('Classifier processing event:', event)
		let activityName: ActivityName | null = null
		const properties = Object.fromEntries(
			Object.entries(event.payload).map(([key, value]) => [key, String(value)])
		)

		switch (event.type) {
			case 'document':
				if (event.payload.action === 'change') {
					activityName = 'coding'
				} else if (event.payload.action === 'selection' || event.payload.action === 'scroll') {
					activityName = 'reading'
				}
				break
			case 'file':
				activityName = event.payload.action === 'switch' ? 'reading' : 'coding'
				break
			case 'debug':
				activityName = 'debugging'
				break
			case 'terminal':
				activityName = 'terminal_usage'
				break
			case 'ai':
				activityName = 'ai_usage'
				break
		}

		if (activityName) {
			logger.debug(`Classifier determined activity: ${activityName}`)
			updateActivity(activityName, properties)
		} else {
			logger.debug(`Classifier did not determine an activity for event type ${event.type}.`)
			lastEventTimestamp = Date.now()
		}
	}

	const checkExpiration = () => {
		const now = Date.now()
		const expiredActivities = activeActivities.filter(a => now - a.lastEventAt > ACTIVITY_EXPIRATION_THRESHOLD)

		if (expiredActivities.length > 0) {
			logger.debug(
				`Expiring activities: ${expiredActivities.map(a => a.name).join(', ')}`
			)
			activeActivities = activeActivities.filter(a => now - a.lastEventAt <= ACTIVITY_EXPIRATION_THRESHOLD)
		}
	}

	const getCurrentActivities = (): ActiveActivity[] => {
		checkExpiration()

		const now = Date.now()
		const timeSinceLastEvent = now - lastEventTimestamp

		if (activeActivities.length === 0) {
			if (timeSinceLastEvent > INACTIVE_THRESHOLD + IDLE_THRESHOLD) {
				return [{ name: 'inactive', startedAt: now, lastEventAt: now, properties: {} }]
			}
			if (timeSinceLastEvent > IDLE_THRESHOLD) {
				return [{ name: 'idle', startedAt: now, lastEventAt: now, properties: {} }]
			}
		}

		return [...activeActivities]
	}

	return {
		processEvent,
		getCurrentActivities
	}
}

// --- Singleton Instance ---
let instance: ActivityClassifier | null = null

export const getActivityClassifier = (): ActivityClassifier => {
	if (!instance) {
		instance = createActivityClassifier()
		logger.info('ActivityClassifier initialized.')
	}
	return instance
} 