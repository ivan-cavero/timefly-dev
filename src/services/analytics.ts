import { machineIdSync } from 'node-machine-id'
import { PostHog } from 'posthog-node'
import type { AnalyticsProperties } from '@/types/analytics'
import { logger } from '../utils/logger'
import * as vscode from 'vscode'

export interface AnalyticsEvent {
	name: string
	distinctId?: string
	properties?: AnalyticsProperties
}

const createAnalyticsService = () => {
	let client: PostHog | null = null
	let isInitialized = false

	const generateDistinctId = (): string => {
		try {
			// Use a stable machine identifier for the user
			return machineIdSync()
		} catch (error) {
			logger.warn('Failed to get machine ID, falling back to random ID.', error)
			// Fallback for cases where machine-id fails
			const timestamp = Date.now()
			const random = Math.random().toString(36).substring(2, 15)
			return `timefly_fallback_${timestamp}_${random}`
		}
	}

	const distinctId = generateDistinctId()

	/**
	 * Initialize the analytics service
	 */
	const init = async (): Promise<void> => {
		if (isInitialized) {
			logger.debug('Analytics service already initialized')
			return
		}

		try {
			// Respect user preference from settings before initializing
			const config = vscode.workspace.getConfiguration('timefly')
			if (!config.get<boolean>('analytics.enabled', true)) {
				logger.info('Analytics disabled via user settings; skipping initialization.')
				return
			}

			const apiKey = process.env.POSTHOG_API_KEY || 'phc_b62mSeeaa5sb7ARZcdqQ7qlXOW2klQX20b3qaPhhjQF'
			const host = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com'

			if (!apiKey) {
				logger.warn('PostHog API key not found. Analytics will be disabled.')
				return
			}

			client = new PostHog(apiKey, {
				host,
				// For VSCode extension environment
				flushAt: 1,
				flushInterval: 0,
				requestTimeout: 5000,
				disableGeoip: true
			})

			isInitialized = true
			logger.info('Analytics service initialized successfully')
		} catch (error) {
			logger.error('Failed to initialize analytics service', error)
		}
	}

	/**
	 * Track a generic event
	 */
	const track = async (event: AnalyticsEvent): Promise<void> => {
		if (!isInitialized || !client) {
			logger.debug('Analytics not initialized, skipping event:', event.name)
			return
		}

		try {
			client.capture({
				distinctId: event.distinctId || distinctId,
				event: event.name,
				properties: {
					...event.properties,
					extension_version: '1.0.0', // Get this from package.json in the future
					timestamp: new Date().toISOString(),
					source: 'vscode_extension'
				}
			})

			logger.debug(`Tracked event: ${event.name}`, event.properties)
		} catch (error) {
			logger.error(`Failed to track event: ${event.name}`, error)
		}
	}

	/**
	 * Track errors or exceptions
	 */
	const trackError = async (error: Error, context?: AnalyticsProperties): Promise<void> => {
		await track({
			name: 'error_occurred',
			properties: {
				error_message: error.message,
				error_stack: error.stack,
				error_name: error.name,
				context,
				timestamp: new Date().toISOString()
			}
		})
	}

	/**
	 * Track performance metrics
	 */
	const trackPerformance = async (
		operation: string,
		duration: number,
		success: boolean,
		metadata?: AnalyticsProperties
	): Promise<void> => {
		await track({
			name: 'performance_metric',
			properties: {
				operation,
				duration_ms: duration,
				success,
				metadata,
				timestamp: new Date().toISOString()
			}
		})
	}

	/**
	 * Set user properties
	 */
	const setUserProperties = async (properties: AnalyticsProperties): Promise<void> => {
		if (!isInitialized || !client) {
			return
		}

		try {
			client.capture({
				distinctId: distinctId,
				event: 'user_properties_updated',
				properties: {
					$set: properties,
					timestamp: new Date().toISOString()
				}
			})

			logger.debug('User properties updated', properties)
		} catch (error) {
			logger.error('Failed to set user properties', error)
		}
	}

	/**
	 * Identify user with additional properties
	 */
	const identify = async (userId?: string, properties?: AnalyticsProperties): Promise<void> => {
		if (!isInitialized || !client) {
			return
		}

		try {
			const finalUserId = userId || distinctId

			if (properties) {
				client.capture({
					distinctId: finalUserId,
					event: '$identify',
					properties: {
						$set: properties,
						timestamp: new Date().toISOString()
					}
				})
			}

			logger.debug(`User identified: ${finalUserId}`, properties)
		} catch (error) {
			logger.error('Failed to identify user', error)
		}
	}

	/**
	 * Shutdown the analytics client
	 */
	const shutdown = async (): Promise<void> => {
		if (client) {
			try {
				await client.shutdown()
				logger.info('Analytics service shutdown complete')
			} catch (error) {
				logger.error('Error during analytics shutdown', error)
			}
		}

		// Reset internal state so isEnabled() reflects shutdown
		client = null
		isInitialized = false
	}

	/**
	 * Get the current distinct ID
	 */
	const getDistinctId = (): string => {
		return distinctId
	}

	/**
	 * Check if analytics is enabled and initialized
	 */
	const isEnabled = (): boolean => {
		return isInitialized && client !== null
	}

	return {
		init,
		track,
		trackError,
		trackPerformance,
		setUserProperties,
		identify,
		shutdown,
		getDistinctId,
		isEnabled
	}
}

// Create a singleton instance but don't auto-initialize
export const analytics = createAnalyticsService()
