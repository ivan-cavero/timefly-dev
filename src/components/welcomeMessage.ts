import * as vscode from 'vscode'
import { configureApiKey as setupApiKey } from '@/auth/setup'
import { handleOpenWebsite } from '@/commands/general'
import { debug, info } from '@/utils/logger'
import { trackWelcomeAction } from '@/utils/telemetry'

export async function showWelcomeMessage(): Promise<void> {
	const message =
		'🚀 TimeFly is ready! Configure your API key to start tracking your coding activity and boost your productivity insights.'
	const configureApiKeyButton = 'Configure API Key'
	const learnMore = 'Learn More'

	try {
		// Track that welcome message was shown
		await trackWelcomeAction('shown')

		const selection = await vscode.window.showInformationMessage(message, configureApiKeyButton, learnMore)

		// Handle button selections and track them
		switch (selection) {
			case configureApiKeyButton:
				info('User clicked Configure API Key button')
				await trackWelcomeAction('configure_api_key')
				await setupApiKey()
				break

			case learnMore:
				info('User clicked Learn More button')
				await trackWelcomeAction('learn_more')
				await handleOpenWebsite('welcome_message')
				break

			default:
				// User dismissed the message without clicking any button
				debug('Welcome message dismissed without selection')
				await trackWelcomeAction('dismissed')
				break
		}
	} catch (error) {
		throw new Error(`Error showing welcome message: ${error instanceof Error ? error.message : 'Unknown error'}`)
	}
}
