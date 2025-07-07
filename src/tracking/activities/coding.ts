import type { Activity, ActivityProperties } from '@/types/tracking'
import { ActivityName } from '@/types/tracking'
import { collectLanguageData } from '../collectors/coding/language'
import { collectTypingData } from '../collectors/coding/typing'

/**
 * If the current state includes "Coding", this function gathers the relevant
 * data from the coding collectors and packages it into an Activity object.
 *
 * @param {number} duration_ms - The duration of the pulse interval.
 * @returns {Activity | null} A `Coding` activity object or null.
 */
export const processCodingActivity = (duration_ms: number): Activity | null => {
	const typingData = collectTypingData()
	const languageData = collectLanguageData()

	// The state manager is the source of truth for activity.
	// We just package the data if there is any to send.
	if (!typingData) {
		return null
	}

	const properties: ActivityProperties = {
		lines_added: String(typingData.lines_added),
		lines_deleted: String(typingData.lines_deleted),
		chars_typed: String(typingData.chars_typed),
		language: languageData.language
	}

	return {
		name: ActivityName.CODING,
		duration_ms,
		properties
	}
} 