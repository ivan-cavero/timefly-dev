import * as vscode from 'vscode';
import { analytics } from '@/services/analytics';

/**
 * Check if analytics is enabled in user settings
 */
function isAnalyticsEnabled(): boolean {
	const config = vscode.workspace.getConfiguration('timefly');
	return config.get<boolean>('analytics.enabled', true);
}

/**
 * Track an event only if analytics is enabled
 */
async function trackEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
	if (!isAnalyticsEnabled()) {
		return;
	}
	
	if (!analytics.isEnabled()) {
		return;
	}

	await analytics.track({
		name: eventName,
		properties
	});
}

/**
 * Track when extension first activates - includes useful environment info
 */
export async function trackActivation(): Promise<void> {
	const packageJson = require('../../package.json');
	
	await trackEvent('extension_activated', {
		extension_version: packageJson.version,
		ide_name: vscode.env.appName,
		ide_version: vscode.version,
		platform: process.platform,
		activation_time: new Date().toISOString()
	});
}

/**
 * Track welcome message interactions - these are the important user actions
 */
export async function trackWelcomeAction(action: 'shown' | 'learn_more' | 'configure_api_key' | 'dismissed'): Promise<void> {
	await trackEvent('welcome_message_interaction', {
		action,
		interaction_time: new Date().toISOString()
	});
}

/**
 * Track API key configuration attempts and success/failure
 */
export async function trackApiKeySetup(success: boolean, error?: string): Promise<void> {
	await trackEvent('api_key_configured', {
		success,
		error_message: error,
		config_time: new Date().toISOString()
	});
}

/**
 * Track when analytics setting is changed by user
 */
export async function trackPrivacyChange(enabled: boolean): Promise<void> {
	// This one should always track regardless of setting, since it's about the setting itself
	if (!analytics.isEnabled()) {
		return;
	}

	await analytics.track({
		name: 'analytics_setting_changed',
		properties: {
			analytics_enabled: enabled,
			change_time: new Date().toISOString()
		}
	});
} 