import * as vscode from 'vscode'
import type { ActivityName } from '../activities'
import type { ActivityMetadata } from '../types'

/**
 * Debugging Activity Detector
 * --------------------------
 * Emits `debugging` activity with metrics:
 *  • `debug_type`          – configuration type (node, chrome, python…)
 *  • `event`               – `debug_start`, `debug_stop`, `breakpoint_hit`
 *  • `breakpoints_hit`     – counter per window
 *  • `exceptions_caught`   – (future) when debug adapter announces exception break.
 */
export const registerDebuggingDetector = (
	context: vscode.ExtensionContext,
	record: (name: ActivityName, meta?: ActivityMetadata) => void
): void => {
	let breakpointsHit = 0

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
				event: 'debug_stop'
			})
			breakpointsHit = 0
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
		})
	)
} 