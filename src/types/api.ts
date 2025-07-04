import type { UserInfo } from './auth'

/**
 * Backend API key validation response
 */
export interface ApiKeyValidationResponse {
	valid: boolean
	user: UserInfo
	apiKeyUuid: string
}

/**
 * Backend API error response
 */
export interface ApiKeyValidationError {
	error: string
	message: string
}

/**
 * Backend validation result with additional metadata
 */
export interface BackendValidationResult {
	isValid: boolean
	user?: UserInfo
	error?: string
	statusCode?: number
}
