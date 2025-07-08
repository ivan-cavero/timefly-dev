/**
 * Collects events related to terminal usage.
 *
 * Events:
 * - Commands executed
 * - Output generated
 */

import * as vscode from 'vscode'
import { logger } from '@/utils/logger'
import type { RawEvent } from '../types'

export type TerminalCollector = ReturnType<typeof createTerminalCollector>

export const createTerminalCollector = (onEvent: (event: RawEvent) => void) => {
	const disposables: vscode.Disposable[] = []

	const handleTerminalOpen = () => {
		onEvent({
			type: 'terminal',
			timestamp: Date.now(),
			payload: { action: 'open' }
		})
	}

	// Note: Capturing terminal writes (`onDidWriteTerminalData`) is possible
	// but can be extremely noisy and has performance implications.
	// For now, we only track when a terminal is opened.

	const initialize = () => {
		logger.info('Initializing TerminalCollector...')
		disposables.push(vscode.window.onDidOpenTerminal(handleTerminalOpen))
	}

	const dispose = () => {
		logger.info('Disposing TerminalCollector...')
		disposables.forEach(d => d.dispose())
	}

	return {
		initialize,
		dispose
	}
} 