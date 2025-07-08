/**
 * Handles the generation of 10-second activity pulses.
 *
 * Responsibilities:
 * - Aggregate classified activities within a 10-second window.
 * - Create `Pulse` objects ready to be stored and synced.
 * - Manage the interval timer for pulse generation.
 */

import { randomUUID } from 'crypto'
import * as vscode from 'vscode'
import { getStorageService } from '@/services/storage'
import { logger } from '@/utils/logger'
import { getActivityClassifier } from './classifier'
import { PULSE_GENERATION_INTERVAL } from './constants'
import { getPulseMetadata } from './metadata'
import type { TrackingStorage } from './storage'
import type { Activity, Pulse } from './types'

export type PulseGenerator = ReturnType<typeof createPulseGenerator>

const createPulseGenerator = (context: vscode.ExtensionContext, trackingStorage: TrackingStorage) => {
	let pulseInterval: NodeJS.Timeout | null = null
	const classifier = getActivityClassifier()
	const storage = getStorageService()

	const generatePulse = async () => {
		const activeActivities = classifier.getCurrentActivities()
		if (activeActivities.length === 0) {
			logger.debug('No active activities, skipping pulse generation.')
			return
		}

		const userInfo = storage.getUserInfo()
		if (!userInfo) {
			logger.warn('No user info found, cannot generate pulse.')
			return
		}

		logger.debug(`Generating pulse with activities: ${activeActivities.map((a) => a.name).join(', ')}`)

		try {
			const pulse: Pulse = {
				event_id: randomUUID(),
				user_id: userInfo.uuid,
				project_id: vscode.workspace.name ?? 'unknown',
				event_time: new Date().toISOString(),
				metadata: await getPulseMetadata(context),
				activities: activeActivities.map(
					(active): Activity => ({
						name: active.name,
						duration_ms: PULSE_GENERATION_INTERVAL, // Simplified for now
						properties: active.properties
					})
				)
			}

			await trackingStorage.addPulse(pulse)
		} catch (error) {
			logger.error('Failed to generate or store pulse.', error)
		}
	}

	const start = () => {
		if (pulseInterval) {
			logger.warn('Pulse generator is already running.')
			return
		}
		logger.info(`Starting pulse generator (${PULSE_GENERATION_INTERVAL}ms interval).`)
		pulseInterval = setInterval(generatePulse, PULSE_GENERATION_INTERVAL)
	}

	const stop = () => {
		if (pulseInterval) {
			clearInterval(pulseInterval)
			pulseInterval = null
			logger.info('Pulse generator stopped.')
		}
	}

	return {
		start,
		stop
	}
}

// Note: PulseGenerator is not a singleton because it depends on instance-specific
// services (like trackingStorage) and needs to be created by the TrackingManager.
export { createPulseGenerator }
