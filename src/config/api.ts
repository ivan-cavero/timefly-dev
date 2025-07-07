import { getStorageService } from '@/services/storage'
import { logger } from '@/utils/logger'

export const API_CONFIG = {
	// Use environment variable for production, default to localhost for development
	BASE_URL: process.env.TIMEFLY_API_URL || 'http://localhost:3001',
	ENDPOINTS: {
		VERIFY_API_KEY: () => '/api/api-keys/verify',
		SYNC_PULSES: () => '/api/pulses/sync'
	},
	HEADERS: {
		'Content-Type': 'application/json'
	},
	TIMEOUT: 15000 // 15 seconds
} as const

/**
 * A simple API client to interact with the TimeFly backend.
 * It automatically includes the API key in the headers.
 */
export const getApi = () => {
	const storage = getStorageService()

	const post = async <T>(endpoint: string, body: unknown): Promise<T> => {
		const apiKey = await storage.getApiKey()
		if (!apiKey) {
			throw new Error('API key not found. Cannot make authenticated request.')
		}

		const url = `${API_CONFIG.BASE_URL}${endpoint}`
		logger.debug(`POST ${url}`)

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				...API_CONFIG.HEADERS,
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify(body)
		})

		if (!response.ok) {
			const errorBody = await response.text()
			logger.error(`API request failed with status ${response.status}: ${errorBody}`)
			throw new Error(`Request failed: ${response.statusText}`)
		}

		return (await response.json()) as T
	}

	return {
		post
	}
}
