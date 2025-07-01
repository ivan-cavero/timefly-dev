import type { ApiKeyValidation } from "@/types/auth";

/**
 * Validate API key format based on backend generation:
 * UUID v7 + hexadecimal hash (e.g., 01234567-1234-7abc-9def-123456789abc1a2b3c4d5e6f7890abcd)
 */
export function validateApiKeyFormat(apiKey: string): ApiKeyValidation {
	if (!apiKey || apiKey.trim().length === 0) {
		return { isValid: false, error: "API key cannot be empty" };
	}

	// Remove any whitespace
	const cleanKey = apiKey.trim();

	// Basic length check - UUID v7 (36 chars) + hash (variable length, typically 16+ chars)
	if (cleanKey.length < 52) {
		return {
			isValid: false,
			error: "API key is too short. Expected format: UUID + hash",
		};
	}

	// Check if it starts with UUID v7 format (xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx)
	const uuidV7Pattern =
		/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
	if (!uuidV7Pattern.test(cleanKey)) {
		return {
			isValid: false,
			error: "Invalid API key format. Must start with UUID v7",
		};
	}

	// Check if the rest is hexadecimal
	const afterUuid = cleanKey.substring(36);
	const hexPattern = /^[0-9a-f]+$/i;
	if (!hexPattern.test(afterUuid)) {
		return {
			isValid: false,
			error: "Invalid API key format. Hash portion must be hexadecimal",
		};
	}

	return { isValid: true };
}

/**
 * Extract user UUID from API key (first 36 characters)
 */
export function extractUserUuidFromApiKey(apiKey: string): string {
	return apiKey.substring(0, 36);
}
