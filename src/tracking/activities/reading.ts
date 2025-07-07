import type { Activity, ActivityProperties } from '@/types/tracking'
import { ActivityName } from '@/types/tracking'
import { collectActiveEditorData } from '../collectors/ide/active_editor'

/**
 * If the current state includes "Reading", this function gathers the relevant
 * data and packages it into an Activity object.
 *
 * @param {number} duration_ms - The duration of the pulse interval.
 * @returns {Activity | null} A `Reading` activity object or null.
 */
export const processReadingActivity = (duration_ms: number): Activity | null => {
	const readingData = collectActiveEditorData()

	if (!readingData) {
		return null
	}

	const properties: ActivityProperties = {
		language: readingData.language ?? 'unknown'
	}

	return {
		name: ActivityName.READING,
		duration_ms,
		properties
	}
} 