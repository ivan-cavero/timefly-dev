import * as vscode from 'vscode'
import type { CodingLanguageData } from '@/types/tracking'

let currentLanguage = 'unknown'

/**
 * Initializes the language collector.
 * Listens for active editor changes to determine the file language.
 */
export const initLanguageCollector = (context: vscode.ExtensionContext) => {
	const listener = vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && editor.document.uri.scheme === 'file') {
			currentLanguage = editor.document.languageId
		}
	})

	// Set initial language if an editor is already open
	if (vscode.window.activeTextEditor) {
		currentLanguage = vscode.window.activeTextEditor.document.languageId
	}

	context.subscriptions.push(listener)
}

/**
 * Collects the currently active language.
 * This is stateful and does not reset.
 *
 * @returns {CodingLanguageData} The collected language data.
 */
export const collectLanguageData = (): CodingLanguageData => {
	return {
		language: currentLanguage
	}
} 