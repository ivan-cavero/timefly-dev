import * as vscode from 'vscode'
import type { ActivityName } from '../activities'
import type { ActivityMetadata } from '../types'

/**
 * Debugging Activity Detector
 * --------------------------
 * Emits `debugging` activity with metrics:
 *  • `debug_type`          – configuration type (node, chrome, python…)
 *  • `event`               – `debug_start`, `debug_stop`, `breakpoint_hit`,
 *                            `step_over`, `step_in`, `step_out`, `exception_break`
 *  • `breakpoints_hit`     – counter per window
 *  • `step_over_count` / `step_in_count` / `step_out_count`
 *  • `exceptions_caught`   – number of exception breaks
 */
export const registerDebuggingDetector = (
	context: vscode.ExtensionContext,
	record: (name: ActivityName, meta?: ActivityMetadata) => void
): void => {
	let breakpointsHit = 0
	let stepOverCount = 0
	let stepInCount = 0
	let stepOutCount = 0
	let exceptionsCaught = 0

	// Start / stop sessions
	context.subscriptions.push(
		vscode.debug.onDidStartDebugSession((session) => {
			record('debugging', {
				debug_type: session.configuration.type,
				event: 'debug_start'
			})
		}),
		vscode.debug.onDidTerminateDebugSession((session) => {
			record('debugging', {
				debug_type: session.configuration.type,
				breakpoints_hit: breakpointsHit,
				step_over_count: stepOverCount,
				step_in_count: stepInCount,
				step_out_count: stepOutCount,
				exceptions_caught: exceptionsCaught,
				event: 'debug_stop'
			})
			breakpointsHit = 0
			stepOverCount = 0
			stepInCount = 0
			stepOutCount = 0
			exceptionsCaught = 0
		})
	)

	// Breakpoint hit via debug console (limited API – using onDidReceiveDebugSessionCustomEvent)
	context.subscriptions.push(
		vscode.debug.onDidReceiveDebugSessionCustomEvent((evt) => {
			if (evt.event === 'stopped' && evt.body?.reason === 'breakpoint') {
				breakpointsHit++
				record('debugging', {
					debug_type: evt.session.configuration.type,
					breakpoints_hit: breakpointsHit,
					event: 'breakpoint_hit'
				})
			}
			if (evt.event === 'stopped' && evt.body?.reason === 'exception') {
				exceptionsCaught++
				record('debugging', {
					debug_type: evt.session.configuration.type,
					exceptions_caught: exceptionsCaught,
					event: 'exception_break'
				})
			}
		})
	)

	// Count stepping commands (if API available)
	const anyCommands = vscode.commands as unknown as { onDidExecuteCommand?: (cb: (e: { command: string }) => void) => vscode.Disposable }
	if (typeof anyCommands.onDidExecuteCommand === 'function') {
		context.subscriptions.push(
			anyCommands.onDidExecuteCommand((cmd: { command: string }) => {
				if (cmd.command === 'workbench.action.debug.stepOver') {
					stepOverCount++
					record('debugging', { step_over_count: stepOverCount, event: 'step_over' })
				} else if (cmd.command === 'workbench.action.debug.stepInto') {
					stepInCount++
					record('debugging', { step_in_count: stepInCount, event: 'step_in' })
				} else if (cmd.command === 'workbench.action.debug.stepOut') {
					stepOutCount++
					record('debugging', { step_out_count: stepOutCount, event: 'step_out' })
				}
			})
		)
	}
} 