import * as vscode from 'vscode'
import { getBufferedEvents } from '@/tracking/tracker'

/**
 * Command: Show buffered TimeFly events (development/debug only)
 */
export const handleShowBufferedEvents = async (): Promise<void> => {
	const events = getBufferedEvents()
	const doc = await vscode.workspace.openTextDocument({
		content: JSON.stringify(events, null, 2),
		language: 'json'
	})
	await vscode.window.showTextDocument(doc, { preview: false })
} 