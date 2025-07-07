import type { Activity, ActivityProperties } from '@/types/tracking'
import { ActivityName } from '@/types/tracking'
import { collectDebuggingStateData } from '../collectors/debugging/session'

/**
 * If the current state includes "Debugging", this function gathers the relevant
 * data and packages it into an Activity object.
 *
 * @param {number} duration_ms - The duration of the pulse interval.
 * @returns {Activity} A `Debugging` activity object.
 */
export const processDebuggingActivity = (duration_ms: number): Activity => {
	const debuggingData = collectDebuggingStateData()

	const properties: ActivityProperties = {
		debugger_type: debuggingData.debugger_type
	}

	return {
		name: ActivityName.DEBUGGING,
		duration_ms,
		properties
	}
} 