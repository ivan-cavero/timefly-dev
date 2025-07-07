import * as vscode from 'vscode'
import { ActivityName } from '@/types/tracking'
import type { DebuggingStateData } from '@/types/tracking'
import { clearActivity, recordActivity } from '../../state'

let isDebugging = false
let debugSessionType = 'unknown'

/**
 * Initializes the debug session collector.
 * Listens for debug session start and stop events.
 */
export const initSessionCollector = (context: vscode.ExtensionContext) => {
	const startListener = vscode.debug.onDidStartDebugSession((session) => {
		isDebugging = true
		debugSessionType = session.type
		recordActivity(ActivityName.DEBUGGING)
	})

	const stopListener = vscode.debug.onDidTerminateDebugSession(() => {
		isDebugging = false
		debugSessionType = 'unknown'
		clearActivity(ActivityName.DEBUGGING)
	})

	// Check initial state
	if (vscode.debug.activeDebugSession) {
		isDebugging = true
		debugSessionType = vscode.debug.activeDebugSession.type
		recordActivity(ActivityName.DEBUGGING)
	}

	context.subscriptions.push(startListener, stopListener)
}

/**
 * Collects the current debugging state.
 *
 * @returns {DebuggingStateData} The collected debugging state.
 */
export const collectDebuggingStateData = (): DebuggingStateData => {
	return {
		is_debugging: isDebugging,
		debugger_type: debugSessionType
	}
} 