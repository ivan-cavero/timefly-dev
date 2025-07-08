/**
 * Collects events related to debugging sessions.
 *
 * Events:
 * - Debug session started
 * - Debug session stopped
 */

import * as vscode from 'vscode'
import { logger } from '@/utils/logger'
import type { RawEvent } from '../types'

export type DebugCollector = ReturnType<typeof createDebugCollector>

export const createDebugCollector = (onEvent: (event: RawEvent) => void) => {
	const disposables: vscode.Disposable[] = []

	const handleDebugStart = (session: vscode.DebugSession) => {
		onEvent({
			type: 'debug',
			timestamp: Date.now(),
			payload: {
				action: 'start',
				debugType: session.type
			}
		})
	}

	const handleDebugStop = (session: vscode.DebugSession) => {
		onEvent({
			type: 'debug',
			timestamp: Date.now(),
			payload: {
				action: 'stop',
				debugType: session.type
			}
		})
	}

	const initialize = () => {
		logger.info('Initializing DebugCollector...')
		disposables.push(vscode.debug.onDidStartDebugSession(handleDebugStart))
		disposables.push(vscode.debug.onDidTerminateDebugSession(handleDebugStop))
	}

	const dispose = () => {
		logger.info('Disposing DebugCollector...')
		disposables.forEach(d => d.dispose())
	}

	return {
		initialize,
		dispose
	}
} 