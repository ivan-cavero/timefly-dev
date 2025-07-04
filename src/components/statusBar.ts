import * as vscode from 'vscode'
import { type StatusBarInfo, StatusBarState } from '@/types/statusBar'
import { logger } from '@/utils/logger'

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

	function dispose() {
		statusBarItem.dispose()
	}

	return {
		init,
		update,
		dispose
	}
}

export const statusBar = createStatusBarService()
