import * as vscode from 'vscode';
import { logger, info } from '@/utils/logger';
import { analytics } from '@/services/analytics';
import { trackActivation, trackPrivacyChange } from '@/utils/telemetry';
import { showWelcomeMessage } from '@/components/welcomeMessage';

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
		try {
			await showWelcomeMessage();
		} catch (welcomeError) {
			logger.error('Failed to show welcome message', welcomeError);
		}
		
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

export async function deactivate() {
	info('TimeFly Dev extension deactivated');
	
	try {
		await analytics.shutdown();
	} catch (error) {
		logger.error('Error during extension deactivation', error);
	}
}
