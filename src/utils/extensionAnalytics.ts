import { analytics } from '../services/analytics';

// Extension-specific analytics interfaces
export interface WelcomeMessageAction {
	action: 'shown' | 'learn_more' | 'configure_api_key' | 'later' | 'dismissed';
	sessionId?: string;
}

export interface ExtensionLifecycleEvent {
	event: 'extension_activated' | 'extension_deactivated';
	details?: Record<string, any>;
}

// Helper function to generate session IDs
function generateSessionId(): string {
	return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Track extension lifecycle events (activation, deactivation)
 */
export async function trackExtensionEvent(event: ExtensionLifecycleEvent): Promise<void> {
	await analytics.track({
		name: event.event,
		properties: event.details
	});
}

/**
 * Track welcome message interactions
 */
export async function trackWelcomeMessage(action: WelcomeMessageAction): Promise<void> {
	await analytics.track({
		name: 'welcome_message_interaction',
		properties: {
			action: action.action,
			session_id: action.sessionId || generateSessionId(),
			interaction_time: new Date().toISOString()
		}
	});
}

/**
 * Track extension activation with detailed information
 */
export async function trackExtensionActivation(vscodeVersion: string): Promise<void> {
	await trackExtensionEvent({
		event: 'extension_activated',
		details: {
			version: '1.0.0',
			vscode_version: vscodeVersion,
			activation_time: new Date().toISOString()
		}
	});
}

/**
 * Track extension deactivation
 */
export async function trackExtensionDeactivation(): Promise<void> {
	await trackExtensionEvent({
		event: 'extension_deactivated',
		details: {
			deactivation_time: new Date().toISOString()
		}
	});
}

/**
 * Track command executions
 */
export async function trackCommandExecution(commandId: string, success: boolean, metadata?: Record<string, any>): Promise<void> {
	await analytics.track({
		name: 'command_executed',
		properties: {
			command_id: commandId,
			success,
			execution_time: new Date().toISOString(),
			metadata
		}
	});
}

/**
 * Track user preferences or settings changes
 */
export async function trackSettingsChange(setting: string, oldValue: any, newValue: any): Promise<void> {
	await analytics.track({
		name: 'settings_changed',
		properties: {
			setting_name: setting,
			old_value: oldValue,
			new_value: newValue,
			change_time: new Date().toISOString()
		}
	});
}

/**
 * Track feature usage
 */
export async function trackFeatureUsage(featureName: string, context?: Record<string, any>): Promise<void> {
	await analytics.track({
		name: 'feature_used',
		properties: {
			feature_name: featureName,
			usage_time: new Date().toISOString(),
			context
		}
	});
} 