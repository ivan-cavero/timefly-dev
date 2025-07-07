import * as vscode from 'vscode'
import { ActivityName } from '@/types/tracking'
import type { ActiveEditorData } from '@/types/tracking'
import { recordActivity } from '../../state'

let lastKnownLanguage: string | undefined

/**
 * Initializes the active editor collector for reading detection.
 */
export const initActiveEditorCollector = (context: vscode.ExtensionContext) => {
	const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && editor.document.uri.scheme === 'file') {
			recordActivity(ActivityName.READING)
			lastKnownLanguage = editor.document.languageId
		} else {
			lastKnownLanguage = undefined
		}
	})

	const visibleRangeListener = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
		if (event.textEditor.document.uri.scheme === 'file') {
			recordActivity(ActivityName.READING)
		}
	})

	// Set initial state
	const activeEditor = vscode.window.activeTextEditor
	if (activeEditor && activeEditor.document.uri.scheme === 'file') {
		recordActivity(ActivityName.READING)
		lastKnownLanguage = activeEditor.document.languageId
	}

	context.subscriptions.push(activeEditorListener, visibleRangeListener)
}

/**
 * Collects data about the active editor to infer reading activity.
 *
 * @returns {ActiveEditorData | null} Data if the user is reading, otherwise null.
 */
export const collectActiveEditorData = (): ActiveEditorData | null => {
	const data: ActiveEditorData = {
		// The state manager is now the source of truth for "is_reading"
		is_reading: true,
		language: lastKnownLanguage
	}

	return data
} 