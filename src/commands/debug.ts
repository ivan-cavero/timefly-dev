import * as vscode from 'vscode'
import { createTrackingStorage } from '@/tracking/storage'
import { logger } from '@/utils/logger'

/**
 * Command to show the contents of the pulse buffer in a new JSON file.
 * This is intended for debugging purposes.
 */
export const handleShowBufferedPulses = async (context: vscode.ExtensionContext) => {
	try {
		// We create a temporary instance of storage just to read the buffer.
		// This avoids complexities with trying to get the singleton instance.
		const trackingStorage = createTrackingStorage(context)
		const pulses = trackingStorage.getBufferedPulses()

		const content = JSON.stringify(pulses, null, 2)
		const document = await vscode.workspace.openTextDocument({
			content,
			language: 'json'
		})

		await vscode.window.showTextDocument(document, vscode.ViewColumn.One)
		logger.info(`Showing ${pulses.length} buffered pulses in a new tab.`)
	} catch (error) {
		logger.error('Failed to show buffered pulses.', error)
		vscode.window.showErrorMessage('Could not display buffered pulses. See logs for details.')
	}
}
