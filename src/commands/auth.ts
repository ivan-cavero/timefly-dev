import * as vscode from 'vscode'
import { configureApiKey } from '@/auth/setup'
import { statusBar } from '@/components/statusBar'
import { getStorageService } from '@/services/storage'
import { stopTracking } from '@/tracking/manager'
import { StatusBarState } from '@/types/statusBar'
import { info, logger } from '@/utils/logger'
import { handleError, trackLogout } from '@/utils/telemetry'

/** Command: Configure API Key */
export const handleConfigureApiKey = async (): Promise<void> => {
	await configureApiKey()
}

/** Command: Logout from TimeFly */
export const handleLogout = async (): Promise<void> => {
	try {
		const storage = getStorageService()
		const userInfo = storage.getUserInfo()

		if (!userInfo) {
			vscode.window.showInformationMessage('📭 You are not currently logged in to TimeFly')
			return
		}

		const confirmMessage =
			'🚪 Logout from TimeFly\n\n' +
			'This will remove your API key and stop tracking your coding activity.\n\n' +
			`Currently logged in as: ${userInfo.name} (${userInfo.email})`

		const selection = await vscode.window.showWarningMessage(confirmMessage, { modal: true }, 'Yes, Logout')

		if (selection === 'Yes, Logout') {
			await storage.clearAllData()
			stopTracking()
			statusBar.update(StatusBarState.UNAUTHENTICATED)

			info('User logged out successfully')
			await trackLogout('completed')

			vscode.window.showInformationMessage('👋 Successfully logged out from TimeFly. Your local data has been cleared.')
		} else {
			logger.debug('Logout cancelled by user')
			await trackLogout('cancelled')
		}
	} catch (error) {
		await handleError(error, { eventName: 'logout_command' })
		vscode.window.showErrorMessage('Failed to logout. Please try again.')
	}
}
