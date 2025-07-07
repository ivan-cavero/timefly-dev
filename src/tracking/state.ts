import { ActivityName } from '@/types/tracking'
import { logger } from '@/utils/logger'

// Configuration based on user feedback
const IDLE_THRESHOLD_MS = 90 * 1000 // 1.5 minutes
const INACTIVE_THRESHOLD_MS = 60 * 1000 // 1 additional minute

let idleTimer: NodeJS.Timeout | undefined
let inactiveTimer: NodeJS.Timeout | undefined

// The current state is a set of activities, allowing for concurrency
const currentActivities = new Set<ActivityName>([ActivityName.INACTIVE])

/**
 * Transitions the state to IDLE.
 */
const goIdle = () => {
	logger.debug('Transitioning to IDLE state.')
	currentActivities.clear()
	currentActivities.add(ActivityName.IDLE)
	// After going idle, set a timer to go inactive
	inactiveTimer = setTimeout(goInactive, INACTIVE_THRESHOLD_MS)
}

/**
 * Transitions the state to INACTIVE.
 */
const goInactive = () => {
	logger.debug('Transitioning to INACTIVE state.')
	currentActivities.clear()
	currentActivities.add(ActivityName.INACTIVE)
}

/**
 * Resets all inactivity timers.
 */
const resetTimers = () => {
	clearTimeout(idleTimer)
	clearTimeout(inactiveTimer)
	idleTimer = setTimeout(goIdle, IDLE_THRESHOLD_MS)
}

/**
 * Records an activity, resetting the idle timer and updating the current state.
 * This is the main entry point for all collectors.
 * @param name The name of the activity that was detected.
 */
export const recordActivity = (name: ActivityName) => {
	resetTimers()

	// If we were idle or inactive, wake up.
	if (currentActivities.has(ActivityName.IDLE) || currentActivities.has(ActivityName.INACTIVE)) {
		currentActivities.clear()
	}

	// Add the new activity. A Set handles duplicates automatically.
	currentActivities.add(name)
}

/**
 * Removes a transient activity from the state.
 * e.g., when a debug session ends.
 * @param name The name of the activity to remove.
 */
export const clearActivity = (name: ActivityName) => {
	currentActivities.delete(name)
}

/**
 * Gets the set of current activities.
 * If no specific activities are active, it returns the current base state (e.g., IDLE).
 * @returns {Set<ActivityName>} The set of current activities.
 */
export const getCurrentActivities = (): Set<ActivityName> => {
	return currentActivities
}

/**
 * Initializes the state manager.
 */
export const initStateManager = () => {
	logger.info('Initializing activity state manager...')
	resetTimers()
} 