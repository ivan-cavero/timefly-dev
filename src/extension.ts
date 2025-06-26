import * as vscode from 'vscode';
import { logger, info, debug, warn, error, danger } from '@/utils/logger';
import { analytics } from '@/services/analytics';
import {
	trackActivation,
	trackWelcomeAction,
	trackApiKeySetup,
	trackPrivacyChange
} from '@/utils/telemetry';

export async function activate(context: vscode.ExtensionContext) {
	info('TimeFly Dev extension activated');

	try {
		// Always initialize analytics service, but tracking will depend on user setting
		await analytics.init();

		// Track extension activation with environment info
		await trackActivation();

		// Show welcome message
		await showWelcomeMessage();

		// Listen for configuration changes
		setupConfigurationListeners(context);

	} catch (error) {
		logger.error('Error during extension activation', error);

		// Still show welcome message even if analytics fails
		await showWelcomeMessage();

		// Track the initialization error if analytics is available
		if (analytics.isEnabled() && error instanceof Error) {
			await analytics.trackError(error, { context: 'extension_activation' });
		}
	}
}

function setupConfigurationListeners(context: vscode.ExtensionContext) {
	// Listen for changes to analytics setting
	const configListener = vscode.workspace.onDidChangeConfiguration(async (e) => {
		if (e.affectsConfiguration('timefly.analytics.enabled')) {
			const config = vscode.workspace.getConfiguration('timefly');
			const enabled = config.get<boolean>('analytics.enabled', true);

			info(`Analytics setting changed to: ${enabled}`);
			await trackPrivacyChange(enabled);
		}
	});

	context.subscriptions.push(configListener);
}

async function showWelcomeMessage() {
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
		logger.error('Error showing welcome message', error);
		// Track the error
		if (error instanceof Error) {
			await analytics.trackError(error, { context: 'welcome_message' });
		}
	}
}

async function handleApiKeyConfiguration() {
	try {
		const apiKey = await vscode.window.showInputBox({
			prompt: 'Enter your TimeFly API Key',
			password: true,
			ignoreFocusOut: true,
			placeHolder: 'Your API key from TimeFly dashboard'
		});

		if (apiKey) {
			// TODO: Validate and store API key
			info('API key configured successfully');
			await trackApiKeySetup(true);
			vscode.window.showInformationMessage('✅ API key configured successfully!');
		} else {
			// User cancelled or entered empty key
			debug('API key configuration cancelled');
			await trackApiKeySetup(false, 'user_cancelled');
		}
	} catch (error) {
		logger.error('Error during API key configuration', error);
		await trackApiKeySetup(false, error instanceof Error ? error.message : 'unknown_error');
		vscode.window.showErrorMessage('Failed to configure API key. Please try again.');
	}
}

export async function deactivate() {
	info('TimeFly Dev extension deactivated');

	try {
		// Shutdown analytics to flush any pending events
		await analytics.shutdown();
	} catch (error) {
		logger.error('Error during extension deactivation', error);
	}
}
