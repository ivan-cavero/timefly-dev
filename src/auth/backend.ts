import { API_CONFIG } from '@/config/api'
import type { ApiKeyValidationError, ApiKeyValidationResponse, BackendValidationResult } from '@/types/api'
import { info, logger, warn } from '@/utils/logger'
import { handleError } from '@/utils/telemetry'

/**
 * Validate API key with TimeFly backend
 */
export const validateApiKeyWithBackend = async (apiKey: string): Promise<BackendValidationResult> => {
	try {
		const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERIFY_API_KEY()}`

		logger.debug(`Validating API key with backend: ${url}`)

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE
			},
			body: JSON.stringify({})
		})

		const statusCode = response.status

		if (response.ok) {
			const data = (await response.json()) as ApiKeyValidationResponse
			info('API key validated successfully with backend')
			return {
				isValid: data.valid,
				user: data.user,
				statusCode
			}
		}
		// Handle non-ok responses
		let errorMessage = 'Unknown error'
		try {
			const errorData = (await response.json()) as ApiKeyValidationError
			errorMessage = errorData.message || errorData.error || 'Unknown error'
		} catch {
			errorMessage = response.statusText || 'Unknown error'
		}

		warn(`API key validation failed: ${statusCode} - ${errorMessage}`)

		return {
			isValid: false,
			error: errorMessage,
			statusCode
		}
	} catch (error) {
		await handleError(error, {
			eventName: 'api_key_validation_network_error'
		})
		return {
			isValid: false,
			error: 'Network error: Unable to connect to TimeFly servers',
			statusCode: 0 // No status code for network errors
		}
	}
}
