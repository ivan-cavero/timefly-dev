import * as vscode from 'vscode';
import { logger, info, debug, warn, error, danger } from './utils/logger';
import { analytics } from './services/analytics';
import { 
	trackExtensionActivation, 
	trackExtensionDeactivation, 
	trackWelcomeMessage 
} from './utils/extensionAnalytics';

export async function activate(context: vscode.ExtensionContext) {
	info('TimeFly Dev extension activated');
	
	try {
		await analytics.init();
		
		// Track extension activation
		await trackExtensionActivation(vscode.version);
		
		// Show welcome message
		showWelcomeMessage();
		
	} catch (error) {
		logger.error('Error during extension activation', error);
		
		// Still show welcome message even if analytics fails
		showWelcomeMessage();
		
		// Track the initialization error if analytics is available
		if (analytics.isEnabled() && error instanceof Error) {
			await analytics.trackError(error, { context: 'extension_activation' });
		}
	}
}

async function showWelcomeMessage() {
	const message = '🚀 TimeFly is ready! Configure your API key to start tracking your coding activity and boost your productivity insights.';
	const learnMore = 'Learn More';
	const configureApiKey = 'Configure API Key';
	const later = 'Later';

	try {
		// Track that welcome message was shown
		await trackWelcomeMessage({ action: 'shown' });

		const selection = await vscode.window.showInformationMessage(
			message,
			learnMore,
			configureApiKey,
			later
		);

		// Handle button selections and track them
		switch (selection) {
			case learnMore:
				info('User clicked Learn More button');
				await trackWelcomeMessage({ action: 'learn_more' });
				// TODO: Open documentation link
				vscode.window.showInformationMessage('Learn More functionality will be implemented soon!');
				break;
			
			case configureApiKey:
				info('User clicked Configure API Key button');
				await trackWelcomeMessage({ action: 'configure_api_key' });
				// TODO: Execute configure API key command
				vscode.window.showInformationMessage('Configure API Key functionality will be implemented soon!');
				break;
			
			case later:
				info('User clicked Later button - message dismissed');
				await trackWelcomeMessage({ action: 'later' });
				break;
			
			default:
				// User dismissed the message without clicking any button
				debug('Welcome message dismissed without selection');
				await trackWelcomeMessage({ action: 'dismissed' });
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

export async function deactivate() {
	info('TimeFly Dev extension deactivated');
	
	try {
		// Track extension deactivation
		await trackExtensionDeactivation();

		// Shutdown analytics to flush any pending events
		await analytics.shutdown();
	} catch (error) {
		logger.error('Error during extension deactivation', error);
	}
}
