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
 *  • `scroll_distance_lines` – accumulated scroll distance
 *  • `selected_chars`        – total chars selected in window
 *  • `peek_definition_uses`  – count of Peek Definition commands
 *  • `hover_shows`           – number of times hover tooltip displayed
 *  • `search_queries`        – Number of Find in Files commands
 *  • `tabs_opened` / `tabs_closed` – number of tabs lifetime in window
 *  • `panel_switches`       – visible editor panel changes
 *  • `context_switches`     – file_switch events
 *
 * TODO / Future work: capture `scroll_distance_lines`, `selected_chars`, etc.
 */
export const registerReadingDetector = (
	context: vscode.ExtensionContext,
	record: (name: ActivityName, meta?: ActivityMetadata) => void
): void => {
	let scrollDistance = 0
	let selectedChars = 0
	let peekDefinitionUses = 0
	let hoverShows = 0
	let searchQueries = 0
	let tabsOpened = 0
	let tabsClosed = 0
	let panelSwitches = 0
	let contextSwitches = 0

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
					event: 'selection',
					peek_definition_uses: peekDefinitionUses,
					hover_shows: hoverShows,
					search_queries: searchQueries,
					tabs_opened: tabsOpened,
					tabs_closed: tabsClosed,
					panel_switches: panelSwitches,
					context_switches: contextSwitches
				})
			}
		})
	)

	// Peek Definition & Find in Files commands
	const anyCommands = vscode.commands as unknown as { onDidExecuteCommand?: (cb: (e: { command: string }) => void) => vscode.Disposable }
	if (typeof anyCommands.onDidExecuteCommand === 'function') {
		context.subscriptions.push(
			anyCommands.onDidExecuteCommand((cmd: { command: string }) => {
				if (cmd.command === 'editor.action.peekDefinition') {
					peekDefinitionUses++
					record('reading', { event: 'peek_definition', peek_definition_uses: peekDefinitionUses })
				} else if (cmd.command === 'workbench.action.findInFiles') {
					searchQueries++
					record('reading', { event: 'search_query', search_queries: searchQueries })
				}
			})
		)
	}

	// Hover provider to count tooltip shows (returns undefined so doesn't affect others)
	context.subscriptions.push(
		vscode.languages.registerHoverProvider({ scheme: '*' }, {
			provideHover() {
				hoverShows++
				debouncedRecordReading({ hover_shows: hoverShows, event: 'hover' })
				return undefined
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
				selected_chars: selectedChars,
				peek_definition_uses: peekDefinitionUses,
				hover_shows: hoverShows,
				search_queries: searchQueries,
				tabs_opened: tabsOpened,
				tabs_closed: tabsClosed,
				panel_switches: panelSwitches,
				context_switches: contextSwitches
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
				contextSwitches++
				debouncedRecordReading({
					language: doc.languageId,
					file_name: nameOnly3,
					file_path: relPath3,
					...(ext3 ? { file_extension: ext3 } : {}),
					event: 'file_switch',
					peek_definition_uses: peekDefinitionUses,
					hover_shows: hoverShows,
					search_queries: searchQueries,
					tabs_opened: tabsOpened,
					tabs_closed: tabsClosed,
					panel_switches: panelSwitches,
					context_switches: contextSwitches
				})
			}
		})
	)

	// Tabs opened/closed
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(() => {
			tabsOpened++
			record('reading', { event: 'tab_opened', tabs_opened: tabsOpened })
		}),
		vscode.workspace.onDidCloseTextDocument(() => {
			tabsClosed++
			record('reading', { event: 'tab_closed', tabs_closed: tabsClosed })
		})
	)
	// Panel switches
	context.subscriptions.push(
		vscode.window.onDidChangeVisibleTextEditors(() => {
			panelSwitches++
			record('reading', { event: 'panel_switch', panel_switches: panelSwitches })
		})
	)
} 