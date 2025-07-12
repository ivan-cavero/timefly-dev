import * as vscode from 'vscode'
import { basename, extname } from 'node:path'
import type { ActivityName } from '../activities'
import type { ActivityMetadata } from '../types'
import { createDebounce } from '@/utils/throttle'

/**
 * Reading Activity Detector
 * ------------------------
 * Detects actions related to reading / inspecting code and emits the
 * `reading` activity.
 *
 * Properties collected per record (`properties` field):
 *  • `language`           – document languageId
 *  • `file_extension`     – file extension without dot
 *  • `file_name`          – file name only
 *  • `scroll_distance_lines` (optional) – accumulated scroll distance
 *  • `event`              – Type of action:
 *       – `selection`, `scroll`, `file_switch`
 *
 * TODO / Future work: capture `scroll_distance_lines`, `selected_chars`, etc.
 */
export const registerReadingDetector = (
	context: vscode.ExtensionContext,
	record: (name: ActivityName, meta?: ActivityMetadata) => void
): void => {
	let scrollDistance = 0
	let selectedChars = 0

	const lastTopLine = new WeakMap<vscode.TextDocument, number>()

	const debouncedRecordReading = createDebounce((m: ActivityMetadata) => record('reading', m), 100)

	// Cursor selection (non-empty) indicates reading/inspection
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection((e) => {
			if (e.selections.some((sel) => !sel.isEmpty)) {
				const doc = e.textEditor.document
				selectedChars += e.selections.reduce((acc, sel) => acc + doc.getText(sel).length, 0)
				const relPath = vscode.workspace.asRelativePath(doc.fileName)
				const nameOnly = basename(doc.fileName)
				const ext = extname(doc.fileName).slice(1)
				debouncedRecordReading({
					language: doc.languageId,
					file_name: nameOnly,
					file_path: relPath,
					...(ext ? { file_extension: ext } : {}),
					event: 'selection'
				})
			}
		})
	)

	// Scroll (visible range changes)
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
			const doc = e.textEditor.document
			const topLinePrev = lastTopLine.get(doc) ?? e.visibleRanges[0].start.line
			const topLineNew = e.visibleRanges[0].start.line
			scrollDistance += Math.abs(topLineNew - topLinePrev)
			lastTopLine.set(doc, topLineNew)
			const relPath2 = vscode.workspace.asRelativePath(doc.fileName)
			const nameOnly2 = basename(doc.fileName)
			const ext2 = extname(doc.fileName).slice(1)
			debouncedRecordReading({
				language: doc.languageId,
				file_name: nameOnly2,
				file_path: relPath2,
				...(ext2 ? { file_extension: ext2 } : {}),
				event: 'scroll',
				scroll_distance_lines: scrollDistance,
				selected_chars: selectedChars
			})
		})
	)

	// File switch
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor) {
				const doc = editor.document
				const relPath3 = vscode.workspace.asRelativePath(doc.fileName)
				const nameOnly3 = basename(doc.fileName)
				const ext3 = extname(doc.fileName).slice(1)
				debouncedRecordReading({
					language: doc.languageId,
					file_name: nameOnly3,
					file_path: relPath3,
					...(ext3 ? { file_extension: ext3 } : {}),
					event: 'file_switch'
				})
			}
		})
	)
} 