import * as vscode from 'vscode'
import { analytics } from '@/services/analytics'
import type { AnalyticsProperties } from '@/types/analytics'
import { error as logError } from './logger'

/** Checks if analytics is enabled in user settings */
const isAnalyticsEnabled = (): boolean => {
	const config = vscode.workspace.getConfiguration('timefly')
	return config.get<boolean>('analytics.enabled', true)
}

/**
 * Centralized error handler that logs and tracks errors.
 * @param error The error object.
 * @param context An object providing context about where the error occurred.
 */
export const handleError = async (
	error: unknown,
	context: {
		eventName: string
		[key: string]: string | number | boolean
	}
): Promise<void> => {
	// 1. Log the error to the console for immediate debugging
	logError(`Error in ${context.eventName}:`, {
		error,
		...context
	})

	// 2. Track the error with analytics if enabled
	if (analytics.isEnabled() && error instanceof Error) {
		await analytics.trackError(error, context)
	}
}

/** Track an event only if analytics is enabled */
const trackEvent = async (eventName: string, properties?: AnalyticsProperties): Promise<void> => {
	if (!isAnalyticsEnabled() || !analytics.isEnabled()) {
		return
	}

	await analytics.track({
		name: eventName,
		properties
	})
}

/** Track when extension first activates */
export const trackActivation = async (context: vscode.ExtensionContext): Promise<void> => {
	const { version } = context.extension.packageJSON

	await trackEvent('extension_activated', {
		extension_version: version,
		ide_name: vscode.env.appName,
		ide_version: vscode.version,
		platform: process.platform
	})
}

/** Track when the user opens the TimeFly website */
export const trackWebsiteOpened = async (source: 'welcome_message' | 'status_bar'): Promise<void> => {
	await trackEvent('website_opened', { source })
}

/** Track welcome message interactions */
export const trackWelcomeAction = async (action: 'shown' | 'learn_more' | 'configure_api_key' | 'dismissed'): Promise<void> => {
	await trackEvent('welcome_message_interaction', { action })
}

/** Track API key configuration attempts and success/failure */
export const trackApiKeySetup = async (success: boolean, error?: string): Promise<void> => {
	await trackEvent('api_key_configured', {
		success,
		error_message: error
	})
}

/** Track user logout attempts */
export const trackLogout = async (action: 'completed' | 'cancelled' | 'error', error?: string): Promise<void> => {
	await trackEvent('logout_attempt', {
		action,
		error_message: error
	})
}

/** Track when analytics setting is changed by user */
export const trackPrivacyChange = async (enabled: boolean): Promise<void> => {
	// This one should always track regardless of setting, since it's about the setting itself
	if (!analytics.isEnabled()) {
		return
	}

	await analytics.track({
		name: 'analytics_setting_changed',
		properties: {
			analytics_enabled: enabled
		}
	})
}
