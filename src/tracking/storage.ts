/**
 * Manages the hybrid storage of activity pulses.
 *
 * Responsibilities:
 * - Store pulses in local VS Code storage for immediate persistence.
 * - Batch pulses for periodic syncing to the remote server.
 * - Handle sync failures and retry logic.
 * - Provide an interface for querying locally stored data if needed.
 */

import type * as vscode from 'vscode'
import { API_CONFIG } from '@/config/api'
import { getStorageService } from '@/services/storage'
import { logger } from '@/utils/logger'
import { PRODUCTIVE_ACTIVITIES, PULSE_GENERATION_INTERVAL } from './constants'
import type { DailySummary, Pulse } from './types'

const PULSE_STORAGE_KEY = 'timefly.tracking.pulseBuffer'
const DAILY_SUMMARY_KEY = 'timefly.tracking.dailySummary'

// Helper to get today's date in YYYY-MM-DD format
const getTodayDateString = () => new Date().toISOString().slice(0, 10)

export type TrackingStorage = ReturnType<typeof createTrackingStorage>

const createTrackingStorage = (context: vscode.ExtensionContext) => {
	const globalState = context.globalState
	const storageService = getStorageService()

	const getDailySummary = (): DailySummary => {
		const today = getTodayDateString()
		const summary = globalState.get<DailySummary>(DAILY_SUMMARY_KEY)

		// If summary exists and is for today, return it. Otherwise, reset.
		if (summary && summary.date === today) {
			return summary
		}
		logger.info(`New day or no summary found. Resetting daily summary for ${today}.`)
		return { date: today, productiveTimeMs: 0 }
	}

	const saveDailySummary = async (summary: DailySummary) => {
		await globalState.update(DAILY_SUMMARY_KEY, summary)
	}

	const getBufferedPulses = (): Pulse[] => {
		return globalState.get<Pulse[]>(PULSE_STORAGE_KEY, [])
	}

	const savePulses = async (pulses: Pulse[]): Promise<void> => {
		await globalState.update(PULSE_STORAGE_KEY, pulses)
	}

	const addPulse = async (pulse: Pulse) => {
		try {
			const pulses = getBufferedPulses()
			pulses.push(pulse)
			await savePulses(pulses)
			logger.debug(`Pulse added to buffer. Buffer size: ${pulses.length}`)

			// Check if the pulse contains productive activity
			const isProductive = pulse.activities.some((activity) => (PRODUCTIVE_ACTIVITIES as readonly string[]).includes(activity.name))

			if (isProductive) {
				const summary = getDailySummary()
				summary.productiveTimeMs += PULSE_GENERATION_INTERVAL
				await saveDailySummary(summary)
				logger.debug(`Productive time updated: ${summary.productiveTimeMs}ms`)
			}
		} catch (error) {
			logger.error('Failed to add pulse to buffer.', error)
		}
	}

	const getAndClearPulses = async (): Promise<Pulse[]> => {
		const pulses = getBufferedPulses()
		await savePulses([])
		logger.info(`Cleared ${pulses.length} pulses from buffer.`)
		return pulses
	}

	const sync = async (): Promise<boolean> => {
		const pulsesToSync = await getAndClearPulses()

		if (pulsesToSync.length === 0) {
			logger.info('No pulses to sync.')
			return true
		}

		logger.operationStart('Syncing pulses', `Count: ${pulsesToSync.length}`)
		const startTime = Date.now()

		try {
			const apiKey = await storageService.getApiKey()
			if (!apiKey) {
				logger.warn('No API key found. Sync aborted.')
				// IMPORTANT: Re-buffer the pulses if sync fails due to no key
				await savePulses(pulsesToSync)
				return false
			}

			const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SYNC_EVENTS()}`, {
				method: 'POST',
				headers: {
					...API_CONFIG.HEADERS,
					'X-API-Key': apiKey
				},
				body: JSON.stringify({ events: pulsesToSync })
			})

			const duration = Date.now() - startTime
			if (response.ok) {
				logger.operationEnd('Syncing pulses', duration, 'SUCCESS')
				return true
			}
			logger.operationEnd('Syncing pulses', duration, 'FAILED', `Status: ${response.status}`)
			logger.error(`Sync failed with status: ${response.status}`, await response.text())
			// Re-buffer pulses on failure
			await savePulses(pulsesToSync)
			return false
		} catch (error) {
			const duration = Date.now() - startTime
			logger.operationEnd('Syncing pulses', duration, 'ERROR')
			logger.error('An unexpected error occurred during sync.', error)
			// Re-buffer pulses on error
			await savePulses(pulsesToSync)
			return false
		}
	}

	return {
		addPulse,
		getAndClearPulses,
		sync,
		getBufferedPulses,
		getDailySummary
	}
}

export { createTrackingStorage }
