import type { ApiKeyValidation } from '@/types/auth'

/**
 * Validates the new API key format: tfk_ + 32 URL-safe characters.
 * e.g., tfk_S25nIOfC_Tle6S3eE-23y5sftwzPj4aF
 */
export function validateApiKeyFormat(apiKey: string): ApiKeyValidation {
	if (!apiKey || apiKey.trim().length === 0) {
		return { isValid: false, error: 'API key cannot be empty' }
	}

	const cleanKey = apiKey.trim()

	// 1. Check for the prefix
	if (!cleanKey.startsWith('tfk_')) {
		return {
			isValid: false,
			error: 'Invalid format. API key must start with "tfk_".',
		}
	}

	// 2. Check for the total length (4 chars for prefix + 32 for the key)
	if (cleanKey.length !== 36) {
		return {
			isValid: false,
			error: `Invalid length. API key must be 36 characters long, but got ${cleanKey.length}.`,
		}
	}

	// 3. Check if the remaining characters are URL-safe
	const keyPart = cleanKey.substring(4)
	const urlSafePattern = /^[a-zA-Z0-9_-]+$/
	if (!urlSafePattern.test(keyPart)) {
		return {
			isValid: false,
			error: 'Invalid characters. The key portion contains non-URL-safe characters.',
		}
	}

	return { isValid: true }
}
