import * as vscode from 'vscode'
import { validateApiKeyWithBackend } from '@/auth/backend'
import { handleConfigureApiKey, handleLogout } from '@/commands/auth'
import { handleOpenWebsite } from '@/commands/general'
import { statusBar } from '@/components/statusBar'
import { showWelcomeMessage } from '@/components/welcomeMessage'
import { analytics } from '@/services/analytics'
import { initStorageService, type StorageService } from '@/services/storage'
import { StatusBarState } from '@/types/statusBar'
import { info, warn } from '@/utils/logger'
import { handleError, trackActivation, trackPrivacyChange } from '@/utils/telemetry'

const registerCommands = (context: vscode.ExtensionContext) => {
	// Register TimeFly commands
	const commands = [
		vscode.commands.registerCommand('timefly.configureApiKey', handleConfigureApiKey),
		vscode.commands.registerCommand('timefly.logout', handleLogout),
		vscode.commands.registerCommand('timefly.openWebsite', handleOpenWebsite)
	]

	// Add all commands to subscriptions for proper cleanup
	context.subscriptions.push(...commands)
	info('TimeFly commands registered')
}

const setupConfigurationListeners = (context: vscode.ExtensionContext) => {
	// Listen for changes to analytics setting
	const configListener = vscode.workspace.onDidChangeConfiguration(async (e) => {
		if (e.affectsConfiguration('timefly.analytics.enabled')) {
			const config = vscode.workspace.getConfiguration('timefly')
			const enabled = config.get<boolean>('analytics.enabled', true)

			info(`Analytics setting changed to: ${enabled}`)
			await trackPrivacyChange(enabled)
		}
	})

	context.subscriptions.push(configListener)
}

/**
 * Initialize storage service and make it available globally
 */
const setupStorageService = (context: vscode.ExtensionContext): { storageService: StorageService } => {
	const storage = initStorageService(context)
	info('Storage service initialized')
	return { storageService: storage }
}

/**
 * Handle startup authentication check
 */
const handleStartupAuthentication = async (storage: StorageService): Promise<void> => {
	try {
		const apiKey = await storage.getApiKey()

		if (apiKey) {
			// An API key exists, so we need to re-validate it with the backend
			info('Found existing API key, re-validating with backend...')
			const validation = await validateApiKeyWithBackend(apiKey)

			if (validation.isValid && validation.user) {
				// API key is still valid
				const userName = validation.user.name || validation.user.email || 'Developer'
				info(`Welcome back ${userName}! TimeFly is ready to track your coding time.`)
				statusBar.update(StatusBarState.AUTHENTICATED)

				// Silently update user info in case it has changed
				await storage.storeUserInfo(validation.user)
			} else {
				// API key is no longer valid (e.g., revoked)
				warn('Stored API key is no longer valid. Forcing logout.')
				await storage.clearAllData()
				statusBar.update(StatusBarState.UNAUTHENTICATED)
				vscode.window.showWarningMessage('Your TimeFly session has expired. Please configure your API key again.')
			}
		} else {
			// No API key, treat as a fresh start
			info('No API key found. Showing welcome message for setup.')
			statusBar.update(StatusBarState.UNAUTHENTICATED)
			await showWelcomeMessage()
		}
	} catch (error) {
		statusBar.update(StatusBarState.ERROR)
		await handleError(error, { eventName: 'startup_authentication_check' })
		// Fallback to welcome message on error
		await showWelcomeMessage()
	}
}

export const activate = async (context: vscode.ExtensionContext) => {
	info('TimeFly Dev extension activated')

	// ALWAYS register commands first, regardless of initialization errors
	registerCommands(context)

	// Initialize status bar
	statusBar.init(context)
	statusBar.update(StatusBarState.INITIALIZING)

	try {
		// Initialize storage service with context
		const { storageService } = setupStorageService(context)

		// Always initialize analytics service, but tracking will depend on user setting
		await analytics.init()

		// Track extension activation with environment info
		await trackActivation(context)

		// Check authentication status and show appropriate message
		await handleStartupAuthentication(storageService)

		// Listen for configuration changes
		setupConfigurationListeners(context)
	} catch (error) {
		statusBar.update(StatusBarState.ERROR)
		await handleError(error, { eventName: 'extension_activation' })

		// Fallback to welcome message even if other parts of activation fail
		try {
			await showWelcomeMessage()
		} catch (welcomeError) {
			await handleError(welcomeError, {
				eventName: 'show_welcome_message_fallback'
			})
		}
	}
}

export const deactivate = async () => {
	info('TimeFly Dev extension deactivated')

	try {
		await analytics.shutdown()
	} catch (error) {
		await handleError(error, { eventName: 'extension_deactivation' })
	}
}
