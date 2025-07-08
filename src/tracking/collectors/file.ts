/**
 * Collects events related to file operations.
 *
 * Events:
 * - File switching (opening different files)
 * - File creation
 * - File deletion
 * - File renaming
 */

import * as path from 'node:path'
import * as vscode from 'vscode'
import { logger } from '@/utils/logger'
import type { RawEvent } from '../types'

export type FileCollector = ReturnType<typeof createFileCollector>

export const createFileCollector = (onEvent: (event: RawEvent) => void) => {
	const disposables: vscode.Disposable[] = []

	const handleFileSwitch = (editor: vscode.TextEditor | undefined) => {
		if (editor && editor.document.uri.scheme === 'file') {
			onEvent({
				type: 'file',
				timestamp: Date.now(),
				payload: {
					action: 'switch',
					fileName: path.basename(editor.document.fileName)
				}
			})
		}
	}

	const handleFileCreate = (e: vscode.FileCreateEvent) => {
		e.files.forEach((file) => {
			onEvent({
				type: 'file',
				timestamp: Date.now(),
				payload: { action: 'create', fileName: path.basename(file.fsPath) }
			})
		})
	}

	const handleFileDelete = (e: vscode.FileDeleteEvent) => {
		e.files.forEach((file) => {
			onEvent({
				type: 'file',
				timestamp: Date.now(),
				payload: { action: 'delete', fileName: path.basename(file.fsPath) }
			})
		})
	}

	const initialize = () => {
		logger.info('Initializing FileCollector...')
		disposables.push(vscode.window.onDidChangeActiveTextEditor(handleFileSwitch))
		disposables.push(vscode.workspace.onDidCreateFiles(handleFileCreate))
		disposables.push(vscode.workspace.onDidDeleteFiles(handleFileDelete))
		// Note: onDidRenameFiles can also be added if needed.
	}

	const dispose = () => {
		logger.info('Disposing FileCollector...')
		disposables.forEach((d) => d.dispose())
	}

	return {
		initialize,
		dispose
	}
}
