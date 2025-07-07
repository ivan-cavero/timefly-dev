import * as vscode from 'vscode'
import { ActivityName } from '@/types/tracking'
import type { CodingTypingData } from '@/types/tracking'
import { recordActivity } from '../../state'

// State for the typing collector
let linesAdded = 0
let linesDeleted = 0
let charCount = 0

/**
 * Initializes the typing collector.
 * Listens for text changes to aggregate typing stats.
 */
export const initTypingCollector = (context: vscode.ExtensionContext) => {
	const listener = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.uri.scheme !== 'file' || event.contentChanges.length === 0) {
			return
		}

		for (const change of event.contentChanges) {
			// Any change with text is considered a coding activity
			if (change.text.length > 0) {
				recordActivity(ActivityName.CODING)
			}

			charCount += change.text.length
			charCount -= change.rangeLength

			const linesChanged = change.text.split('\n').length - 1
			const rangeLines = change.range.end.line - change.range.start.line

			if (linesChanged > rangeLines) {
				linesAdded += linesChanged - rangeLines
			} else if (rangeLines > linesChanged) {
				linesDeleted += rangeLines - linesChanged
			}
		}
	})

	context.subscriptions.push(listener)
}

/**
 * Collects and resets the typing data for the current interval.
 *
 * @returns {CodingTypingData | null} The collected data or null if no significant typing.
 */
export const collectTypingData = (): CodingTypingData | null => {
	if (linesAdded === 0 && linesDeleted === 0 && charCount === 0) {
		return null
	}

	const data: CodingTypingData = {
		lines_added: linesAdded,
		lines_deleted: linesDeleted,
		// Ensure chars_typed is not negative
		chars_typed: Math.max(0, charCount)
	}

	// Reset state for the next interval
	linesAdded = 0
	linesDeleted = 0
	charCount = 0

	return data
} 