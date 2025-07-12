import * as vscode from 'vscode'
import { basename, extname } from 'path'
import type { ActivityName } from '../activities'
import type { ActivityMetadata } from '../types'
import { createDebounce } from '@/utils/throttle'

/**
 * Coding Activity Detector
 * -----------------------
 * Identifies actions that imply writing or manipulating code and emits the
 * `coding` activity together with rich metadata.
 *
 * Properties collected per record (`properties` field):
 *  • `language`        – document languageId (`typescript`, `python`, ...)
 *  • `file_extension`  – file extension without dot (`ts`, `py`, ...)
 *  • `file_name`       – file name only (e.g. `app.ts`)
 *  • `file_path`       – workspace-relative path (`src/app.ts`)
 *  • `lines_added`     – lines inserted during the window
 *  • `lines_deleted`   – lines removed
 *  • `chars_typed`     – raw character count typed
 *  • `event`           – Trigger source:
 *       – `text_change`, `file_create`, `file_delete`, `terminal_open`, `terminal_focus`
 *
 * TODO / Future work: add counters like `lines_added`, `chars_typed`, etc.
 * Simply append them to the `meta` object passed to `record` and the tracker
 * will merge them automatically.
 */
export const registerCodingDetector = (
	context: vscode.ExtensionContext,
	record: (name: ActivityName, meta?: ActivityMetadata) => void
): void => {
	const debouncedRecordCoding = createDebounce((m: ActivityMetadata) => record('coding', m), 50)
	// Text edits
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((e) => {
			const doc = e.document
			let linesAdded = 0
			let linesDeleted = 0
			let charsTyped = 0

			for (const change of e.contentChanges) {
				charsTyped += change.text.length
				const newLines = change.text.split(/\r?\n/).length - 1
				linesAdded += newLines
				if (change.rangeLength) {
					linesDeleted += doc.getText(change.range).split(/\r?\n/).length - 1
				}
			}
			const relPath = vscode.workspace.asRelativePath(doc.fileName)
			const nameOnly = basename(doc.fileName)
			const ext = extname(doc.fileName).slice(1)
			debouncedRecordCoding({
				language: doc.languageId,
				file_name: nameOnly,
				file_path: relPath,
				...(ext ? { file_extension: ext } : {}),
				lines_added: linesAdded,
				lines_deleted: linesDeleted,
				chars_typed: charsTyped,
				event: 'text_change'
			} as ActivityMetadata)
		})
	)

	// File create / delete
	context.subscriptions.push(
		vscode.workspace.onDidCreateFiles((e) => {
			record('coding', { event: 'file_create', files: String(e.files.length) })
		}),
		vscode.workspace.onDidDeleteFiles((e) => {
			record('coding', { event: 'file_delete', files: String(e.files.length) })
		})
	)

	// Terminal focus/open as proxy for coding (e.g., running commands)
	context.subscriptions.push(
		vscode.window.onDidOpenTerminal(() => record('coding', { event: 'terminal_open' })),
		vscode.window.onDidChangeActiveTerminal(() => record('coding', { event: 'terminal_focus' }))
	)
} 