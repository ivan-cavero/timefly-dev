import * as vscode from 'vscode'
import { logger } from '@/utils/logger'
import { type StatusBarInfo, StatusBarState } from '@/types/statusBar'
import type { TrackingStats } from '@/types/tracking'

const STATUS_BAR_STATES: Record<StatusBarState, StatusBarInfo> = {
	[StatusBarState.INITIALIZING]: {
		text: '$(sync~spin) Initializing TimeFly',
		tooltip: 'TimeFly is starting up...'
	},
	[StatusBarState.UNAUTHENTICATED]: {
		text: '$(warning) Configure API Key',
		tooltip: 'Click to configure your TimeFly API Key',
		command: 'timefly.configureApiKey',
		backgroundColor: 'statusBarItem.warningBackground'
	},
	[StatusBarState.AUTHENTICATED]: {
		text: '$(watch) 0s',
		tooltip: 'TimeFly is tracking your activity. Click to open the web dashboard.',
		command: 'timefly.openWebsite'
	},
	[StatusBarState.ERROR]: {
		text: '$(error) TimeFly Error',
		tooltip: 'An error occurred. Check logs for details.',
		color: 'statusBarItem.errorForeground',
		backgroundColor: 'statusBarItem.errorBackground'
	}
}

/**
 * Formats milliseconds into a more readable string (e.g., 1h 23m 45s).
 */
const formatMilliseconds = (ms: number): string => {
	if (ms < 1000) {
		return '0s'
	}

	const totalSeconds = Math.floor(ms / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	const parts: string[] = []
	if (hours > 0) {
		parts.push(`${hours}h`)
	}
	if (minutes > 0) {
		parts.push(`${minutes}m`)
	}
	if (seconds > 0 || parts.length === 0) {
		parts.push(`${seconds}s`)
	}

	return parts.join(' ')
}

function createStatusBarService() {
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)

	function init(context: vscode.ExtensionContext) {
		context.subscriptions.push(statusBarItem)
		statusBarItem.show()
		logger.info('Status bar initialized')
	}

	function update(state: StatusBarState, dynamicText?: string) {
		const stateInfo = STATUS_BAR_STATES[state]
		statusBarItem.text = dynamicText ?? stateInfo.text
		statusBarItem.tooltip = stateInfo.tooltip
		statusBarItem.command = stateInfo.command

		// Set text and background colors
		statusBarItem.color = stateInfo.color ? new vscode.ThemeColor(stateInfo.color) : undefined
		statusBarItem.backgroundColor = stateInfo.backgroundColor ? new vscode.ThemeColor(stateInfo.backgroundColor) : undefined
	}

	/**
	 * Updates the status bar with the latest tracking statistics.
	 * This is called periodically by the tracking manager.
	 */
	function updateStats(stats: TrackingStats) {
		const totalMs = stats.total_coding_ms + stats.total_reading_ms + stats.total_debugging_ms
		const formattedTotal = formatMilliseconds(totalMs)

		statusBarItem.text = `$(watch) ${formattedTotal}`
		statusBarItem.tooltip = `Time Tracked:\n- Coding: ${formatMilliseconds(
			stats.total_coding_ms
		)}\n- Reading: ${formatMilliseconds(stats.total_reading_ms)}\n- Debugging: ${formatMilliseconds(
			stats.total_debugging_ms
		)}`
		statusBarItem.command = STATUS_BAR_STATES[StatusBarState.AUTHENTICATED].command
		// Reset any error colors
		statusBarItem.color = undefined
		statusBarItem.backgroundColor = undefined
	}

	function dispose() {
		statusBarItem.dispose()
	}

	return {
		init,
		update,
		updateStats,
		dispose
	}
}

export const statusBar = createStatusBarService()
