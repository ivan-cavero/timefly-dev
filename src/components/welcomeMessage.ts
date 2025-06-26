import * as vscode from 'vscode';
import { info, debug } from '@/utils/logger';
import { trackWelcomeAction } from '@/utils/telemetry';
import { handleApiKeyConfiguration } from '@/components/apiKeySetup';

export async function showWelcomeMessage(): Promise<void> {
	const message = '🚀 TimeFly is ready! Configure your API key to start tracking your coding activity and boost your productivity insights.';
	const configureApiKey = 'Configure API Key';
	const learnMore = 'Learn More';

	try {
		// Track that welcome message was shown
		await trackWelcomeAction('shown');

		const selection = await vscode.window.showInformationMessage(
			message,
			configureApiKey,
			learnMore
		);

		// Handle button selections and track them
		switch (selection) {
			case configureApiKey:
				info('User clicked Configure API Key button');
				await trackWelcomeAction('configure_api_key');
				await handleApiKeyConfiguration();
				break;
			
			case learnMore:
				info('User clicked Learn More button');
				await trackWelcomeAction('learn_more');
				
				// Open TimeFly website
				await vscode.env.openExternal(vscode.Uri.parse('https://timefly.dev/'));
				
				showWelcomeMessage();
				break;
			
			default:
				// User dismissed the message without clicking any button
				debug('Welcome message dismissed without selection');
				await trackWelcomeAction('dismissed');
				break;
		}
	} catch (error) {
		throw new Error(`Error showing welcome message: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
} 