import { getStorageService } from '@/services/storage'
import type { Activity, Pulse, PulseMetadata } from '@/types/tracking'
import { getProjectId } from '@/utils/project'
import { logger } from '@/utils/logger'
import { API_CONFIG, getApi } from '@/config/api'
import { collectEnvironmentData } from './collectors/metadata/environment'
import { collectGitData } from './collectors/metadata/git'

let machineId = 'unknown'

export const initPulseManager = (mId: string) => {
	machineId = mId
}

/**
 * Creates a new pulse object with the given activities.
 */
export const createPulse = async (activities: Activity[]): Promise<Pulse | null> => {
	const storage = getStorageService()
	const userInfo = storage.getUserInfo()
	const projectId = await getProjectId()

	if (!userInfo || !projectId) {
		logger.warn('Cannot create pulse without user info and project ID.')
		return null
	}

	// Collect metadata from all sources
	const environmentData = collectEnvironmentData()
	const gitData = collectGitData()

	const metadata: PulseMetadata = {
		...environmentData,
		...gitData,
		machine_id: machineId
	}

	const pulse: Pulse = {
		event_id: crypto.randomUUID(),
		user_id: userInfo.uuid,
		project_id: projectId,
		event_time: new Date().toISOString(),
		metadata,
		activities
	}

	return pulse
}

/**
 * Stores a new pulse in the global state.
 */
export const storePulse = async (pulse: Pulse): Promise<void> => {
	const storage = getStorageService()
	const existingPulses = storage.getPulses()
	const newPulses = [...existingPulses, pulse]
	await storage.storePulses(newPulses)
}

/**
 * Syncs all stored pulses with the backend API.
 * If the sync is successful, it clears the stored pulses.
 */
export const syncPulses = async (): Promise<void> => {
	const storage = getStorageService()
	const pulses = storage.getPulses()

	if (pulses.length === 0) {
		logger.info('No pulses to sync.')
		return
	}

	logger.info(`Syncing ${pulses.length} pulses with the backend...`)

	try {
		const api = getApi()
		// The /sync endpoint is expected to handle an array of pulses
		await api.post(API_CONFIG.ENDPOINTS.SYNC_PULSES(), { pulses })

		logger.info('Successfully synced pulses with the backend.')
		// Clear pulses only after a successful sync
		await storage.clearPulses()
	} catch (error) {
		logger.error('Failed to sync pulses with the backend.', error)
		// We keep the pulses in storage to retry on the next sync interval
	}
}
