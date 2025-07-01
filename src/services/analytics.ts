import { PostHog } from "posthog-node";
import { logger } from "../utils/logger";

export interface AnalyticsEvent {
	name: string;
	distinctId?: string;
	properties?: Record<string, any>;
}

export class AnalyticsService {
	private client: PostHog | null = null;
	private isInitialized = false;
	private distinctId: string;

	constructor() {
		// Generate a unique identifier for this extension instance
		this.distinctId = this.generateDistinctId();
		// Don't auto-initialize, wait for explicit init call
	}

	private generateDistinctId(): string {
		// Use a combination of machine identifier and timestamp for uniqueness
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 15);
		return `timefly_${timestamp}_${random}`;
	}

	/**
	 * Initialize the analytics service
	 */
	async init(): Promise<void> {
		if (this.isInitialized) {
			logger.debug("Analytics service already initialized");
			return;
		}

		try {
			const apiKey =
				process.env.POSTHOG_API_KEY ||
				"phc_b62mSeeaa5sb7ARZcdqQ7qlXOW2klQX20b3qaPhhjQF";
			const host = process.env.POSTHOG_HOST || "https://eu.i.posthog.com";

			if (!apiKey) {
				logger.warn("PostHog API key not found. Analytics will be disabled.");
				return;
			}

			this.client = new PostHog(apiKey, {
				host,
				// For VSCode extension environment
				flushAt: 1,
				flushInterval: 0,
				requestTimeout: 5000,
				disableGeoip: true,
			});

			this.isInitialized = true;
			logger.info("Analytics service initialized successfully");
		} catch (error) {
			logger.error("Failed to initialize analytics service", error);
		}
	}

	/**
	 * Track a generic event
	 */
	async track(event: AnalyticsEvent): Promise<void> {
		if (!this.isInitialized || !this.client) {
			logger.debug("Analytics not initialized, skipping event:", event.name);
			return;
		}

		try {
			this.client.capture({
				distinctId: event.distinctId || this.distinctId,
				event: event.name,
				properties: {
					...event.properties,
					extension_version: "1.0.0", // Get this from package.json in the future
					timestamp: new Date().toISOString(),
					source: "vscode_extension",
				},
			});

			logger.debug(`Tracked event: ${event.name}`, event.properties);
		} catch (error) {
			logger.error(`Failed to track event: ${event.name}`, error);
		}
	}

	/**
	 * Track errors or exceptions
	 */
	async trackError(error: Error, context?: Record<string, any>): Promise<void> {
		await this.track({
			name: "error_occurred",
			properties: {
				error_message: error.message,
				error_stack: error.stack,
				error_name: error.name,
				context,
				timestamp: new Date().toISOString(),
			},
		});
	}

	/**
	 * Track performance metrics
	 */
	async trackPerformance(
		operation: string,
		duration: number,
		success: boolean,
		metadata?: Record<string, any>,
	): Promise<void> {
		await this.track({
			name: "performance_metric",
			properties: {
				operation,
				duration_ms: duration,
				success,
				metadata,
				timestamp: new Date().toISOString(),
			},
		});
	}

	/**
	 * Set user properties
	 */
	async setUserProperties(properties: Record<string, any>): Promise<void> {
		if (!this.isInitialized || !this.client) {
			return;
		}

		try {
			this.client.capture({
				distinctId: this.distinctId,
				event: "user_properties_updated",
				properties: {
					$set: properties,
					timestamp: new Date().toISOString(),
				},
			});

			logger.debug("User properties updated", properties);
		} catch (error) {
			logger.error("Failed to set user properties", error);
		}
	}

	/**
	 * Identify user with additional properties
	 */
	async identify(
		userId?: string,
		properties?: Record<string, any>,
	): Promise<void> {
		if (!this.isInitialized || !this.client) {
			return;
		}

		try {
			const finalUserId = userId || this.distinctId;

			if (properties) {
				this.client.capture({
					distinctId: finalUserId,
					event: "$identify",
					properties: {
						$set: properties,
						timestamp: new Date().toISOString(),
					},
				});
			}

			logger.debug(`User identified: ${finalUserId}`, properties);
		} catch (error) {
			logger.error("Failed to identify user", error);
		}
	}

	/**
	 * Shutdown the analytics client
	 */
	async shutdown(): Promise<void> {
		if (this.client) {
			try {
				await this.client.shutdown();
				logger.info("Analytics service shutdown complete");
			} catch (error) {
				logger.error("Error during analytics shutdown", error);
			}
		}
	}

	/**
	 * Get the current distinct ID
	 */
	getDistinctId(): string {
		return this.distinctId;
	}

	/**
	 * Check if analytics is enabled and initialized
	 */
	isEnabled(): boolean {
		return this.isInitialized && this.client !== null;
	}
}

// Create a singleton instance but don't auto-initialize
export const analytics = new AnalyticsService();
