import * as vscode from 'vscode'
import { statusBar } from '@/components/statusBar'
import { getStorageService } from '@/services/storage'
import { StatusBarState } from '@/types/statusBar'
import { debug, info } from '@/utils/logger'
import { handleError, trackApiKeySetup } from '@/utils/telemetry'
import { validateApiKeyWithBackend } from './backend'
import { validateApiKeyFormat } from './validator'
import { startTrackingAfterAuth } from '@/extension'

/** Show error message with retry option */
const showErrorWithRetry = async (message: string, shouldRetry = true): Promise<boolean> => {
	const retryButton = 'Try Again'
	const cancelButton = 'Cancel'

	const selection = await vscode.window.showErrorMessage(message, ...(shouldRetry ? [retryButton, cancelButton] : [cancelButton]))

	return selection === retryButton
}

/** Get user-friendly error message based on status code */
const getErrorMessage = (statusCode: number, error: string): { message: string; shouldRetry: boolean } => {
	switch (statusCode) {
		case 401:
			return {
				message: '🔐 Invalid API key. Please check your API key and try again.',
				shouldRetry: true
			}
		case 404:
			return {
				message: '👤 User not found. This API key may be associated with a deleted account.',
				shouldRetry: true
			}
		case 500:
			return {
				message: '🔧 Server error. TimeFly servers are experiencing issues. Please try again later.',
				shouldRetry: true
			}
		case 0:
			return {
				message: '🌐 Connection failed. Please check your internet connection and try again.',
				shouldRetry: true
			}
		default:
			return {
				message: `❌ Validation failed: ${error}`,
				shouldRetry: true
			}
	}
}

const attemptApiKeyConfiguration = async (): Promise<void> => {
	try {
		const apiKey = await vscode.window.showInputBox({
			prompt: 'Enter your TimeFly API Key',
			password: true,
			ignoreFocusOut: true,
			placeHolder: 'e.g., tfk_S25nIOfC_Tle6S3eE-23y5sftwzPj4aF',
			validateInput: (value) => {
				if (!value) {
					return null
				} // Allow empty during typing
				const validation = validateApiKeyFormat(value)
				return validation.isValid ? null : validation.error
			},
		})

		if (!apiKey) {
			debug('API key configuration cancelled by user.')
			await trackApiKeySetup(false, 'user_cancelled')
			return
		}

		const validation = validateApiKeyFormat(apiKey)
		if (!validation.isValid) {
			await trackApiKeySetup(false, `validation_failed: ${validation.error}`)
			vscode.window.showErrorMessage(`❌ Invalid API key format: ${validation.error}`)
			// Ask to retry
			const retry = await showErrorWithRetry('Invalid API key format. Would you like to try again?')
			if (retry) {
				await attemptApiKeyConfiguration()
			}
			return
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: '⏳ Validating API key with TimeFly...',
				cancellable: false,
			},
			async () => {
				const backendValidation = await validateApiKeyWithBackend(apiKey)

				if (backendValidation.isValid && backendValidation.user) {
					try {
						const storage = getStorageService()
						await storage.storeApiKey(apiKey)
						await storage.storeUserInfo(backendValidation.user)
						// Start tracking in current session (extension already active)
						startTrackingAfterAuth()
						statusBar.update(StatusBarState.AUTHENTICATED)

						info('API key and user info stored successfully')
						await trackApiKeySetup(true)

						const userName = backendValidation.user.name || backendValidation.user.email || 'Developer'
						const successMessage = `🚀 Welcome ${userName}! Your API key is configured and TimeFly is now tracking your coding time.`

						vscode.window.showInformationMessage(successMessage)
					} catch (storageError) {
						await handleError(storageError, {
							eventName: 'api_key_storage_error',
						})
						const retry = await showErrorWithRetry('🔐 Failed to securely store your API key. Please try again.')
						if (retry) {
							await attemptApiKeyConfiguration()
						}
					}
				} else {
					const { message, shouldRetry } = getErrorMessage(
						backendValidation.statusCode || 0,
						backendValidation.error || 'Unknown error',
					)

					await trackApiKeySetup(false, `backend_validation_failed: ${backendValidation.statusCode} - ${backendValidation.error}`)

					const retry = await showErrorWithRetry(message, shouldRetry)
					if (retry) {
						await attemptApiKeyConfiguration()
					}
				}
			},
		)
	} catch (error) {
		await handleError(error, { eventName: 'configure_api_key_flow' })
		const retry = await showErrorWithRetry('❌ An unexpected error occurred. Please try again.')
		if (retry) {
			await attemptApiKeyConfiguration()
		}
	}
}

/** Handle API key configuration flow */
export const configureApiKey = async (): Promise<void> => {
	await attemptApiKeyConfiguration()
}
