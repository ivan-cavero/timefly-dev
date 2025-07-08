/**
 * Collects events related to document interactions.
 *
 * Events:
 * - Text changes
 * - Cursor movement
 * - Scrolling
 */ 

import * as vscode from 'vscode'
import { logger } from '@/utils/logger'
import type { RawEvent } from '../types'

export type DocumentCollector = ReturnType<typeof createDocumentCollector>

export const createDocumentCollector = (onEvent: (event: RawEvent) => void) => {
	const disposables: vscode.Disposable[] = []

	const handleTextDocumentChange = (e: vscode.TextDocumentChangeEvent) => {
		if (e.document.uri.scheme !== 'file' || e.contentChanges.length === 0) {
			return // Ignore non-file changes or empty changes
		}

		let linesAdded = 0
		let linesDeleted = 0
		let charsAdded = 0

		for (const change of e.contentChanges) {
			linesAdded += (change.text.match(/\n/g) ?? []).length
			linesDeleted += (change.range.end.line - change.range.start.line)
			charsAdded += change.text.length
		}

		onEvent({
			type: 'document',
			timestamp: Date.now(),
			payload: {
				action: 'change',
				languageId: e.document.languageId,
				linesAdded,
				linesDeleted,
				charsAdded
			}
		})
	}

	const handleSelectionChange = (e: vscode.TextEditorSelectionChangeEvent) => {
		if (e.selections.length > 0 && !e.selections[0].isEmpty) {
			onEvent({
				type: 'document',
				timestamp: Date.now(),
				payload: {
					action: 'selection',
					languageId: e.textEditor.document.languageId
				}
			})
		}
	}

	const handleVisibleRangesChange = (e: vscode.TextEditorVisibleRangesChangeEvent) => {
		// This event can be noisy, so we might want to debounce or throttle it later.
		// For now, we'll just log it as a reading activity.
		onEvent({
			type: 'document',
			timestamp: Date.now(),
			payload: {
				action: 'scroll',
				languageId: e.textEditor.document.languageId
			}
		})
	}

	const initialize = () => {
		logger.info('Initializing DocumentCollector...')
		disposables.push(vscode.workspace.onDidChangeTextDocument(handleTextDocumentChange))
		disposables.push(vscode.window.onDidChangeTextEditorSelection(handleSelectionChange))
		disposables.push(vscode.window.onDidChangeTextEditorVisibleRanges(handleVisibleRangesChange))
	}

	const dispose = () => {
		logger.info('Disposing DocumentCollector...')
		disposables.forEach(d => d.dispose())
	}

	return {
		initialize,
		dispose
	}
} 