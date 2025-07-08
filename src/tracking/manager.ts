/**
 * The Tracking Manager is the central orchestrator for all activity tracking.
 *
 * Responsibilities:
 * - Initialize and manage all collectors.
 * - Start and stop the tracking process.
 * - Pass raw events from collectors to the classifier.
 * - Manage the pulse generation and syncing process.
 */

import type * as vscode from 'vscode'
import { getStorageService } from '@/services/storage'
import { logger } from '@/utils/logger'
import { getActivityClassifier } from './classifier'
import { createDebugCollector, type DebugCollector } from './collectors/debug'
import { createDocumentCollector, type DocumentCollector } from './collectors/document'
import { createFileCollector, type FileCollector } from './collectors/file'
import { createTerminalCollector, type TerminalCollector } from './collectors/terminal'
import { SYNC_INTERVAL } from './constants'
import { createPulseGenerator, type PulseGenerator } from './pulse'
import { createTrackingStorage, type TrackingStorage } from './storage'
import type { RawEvent } from './types'

export type TrackingManager = ReturnType<typeof createTrackingManager>

type Collector = DocumentCollector | FileCollector | DebugCollector | TerminalCollector

const createTrackingManager = (context: vscode.ExtensionContext) => {
	const classifier = getActivityClassifier()
	const trackingStorage: TrackingStorage = createTrackingStorage(context)
	const pulseGenerator: PulseGenerator = createPulseGenerator(context, trackingStorage)
	const collectors: Collector[] = []

	let syncInterval: NodeJS.Timeout | null = null
	let isRunning = false

	const onEvent = (event: RawEvent) => {
		if (!isRunning) {
			return
		}
		logger.debug('TrackingManager received event:', event)
		classifier.processEvent(event)
	}

	const initializeCollectors = () => {
		logger.info('Initializing all collectors...')
		collectors.push(createDocumentCollector(onEvent))
		collectors.push(createFileCollector(onEvent))
		collectors.push(createDebugCollector(onEvent))
		collectors.push(createTerminalCollector(onEvent))

		collectors.forEach((c) => c.initialize())
	}

	const disposeCollectors = () => {
		logger.info('Disposing all collectors...')
		collectors.forEach((c) => c.dispose())
		collectors.length = 0 // Clear the array
	}

	const start = () => {
		if (isRunning) {
			logger.warn('Tracking manager is already running.')
			return
		}

		const isAuthenticated = getStorageService().isAuthenticated()
		if (!isAuthenticated) {
			logger.warn('User not authenticated. Tracking will not start.')
			return
		}

		logger.info('Starting tracking manager...')
		isRunning = true

		initializeCollectors()
		pulseGenerator.start()

		// Start the sync interval
		syncInterval = setInterval(() => {
			trackingStorage.sync()
		}, SYNC_INTERVAL)

		// Perform an initial sync on start, but after a short delay
		setTimeout(() => trackingStorage.sync(), 5000) // 5s delay
	}

	const stop = () => {
		if (!isRunning) {
			return
		}

		logger.info('Stopping tracking manager...')
		isRunning = false

		disposeCollectors()
		pulseGenerator.stop()

		if (syncInterval) {
			clearInterval(syncInterval)
			syncInterval = null
		}

		// Perform a final sync on stop to send any remaining data
		trackingStorage.sync()
	}

	return {
		start,
		stop
	}
}

// --- Singleton Instance ---
let instance: TrackingManager | null = null

export const getTrackingManager = (context: vscode.ExtensionContext): TrackingManager => {
	if (!instance) {
		instance = createTrackingManager(context)
		logger.info('TrackingManager initialized.')
	}
	return instance
}
