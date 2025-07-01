import { API_CONFIG } from "@/config/api";
import type {
	ApiKeyValidationError,
	ApiKeyValidationResponse,
	BackendValidationResult,
} from "@/types/api";
import { info, logger, warn } from "@/utils/logger";

/**
 * Validate API key with TimeFly backend
 */
export async function validateApiKeyWithBackend(
	apiKey: string,
): Promise<BackendValidationResult> {
	try {
		const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERIFY_API_KEY()}`;

		logger.debug(`Validating API key with backend: ${url}`);

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"X-API-Key": apiKey,
				"Content-Type": API_CONFIG.HEADERS.CONTENT_TYPE,
			},
			body: JSON.stringify({}),
		});

		const statusCode = response.status;

		if (response.ok) {
			const data = (await response.json()) as ApiKeyValidationResponse;
			info("API key validated successfully with backend");
			return {
				isValid: data.valid,
				user: data.user,
				statusCode,
			};
		} else {
			let errorMessage = "Unknown error";

			try {
				const errorData = (await response.json()) as ApiKeyValidationError;
				errorMessage = errorData.message || errorData.error || "Unknown error";
			} catch {
				// If can't parse JSON, use status text
				errorMessage = response.statusText || "Unknown error";
			}

			warn(`API key validation failed: ${statusCode} - ${errorMessage}`);

			return {
				isValid: false,
				error: errorMessage,
				statusCode,
			};
		}
	} catch (error) {
		logger.error("Network error during API key validation", error);
		return {
			isValid: false,
			error: "Network error: Unable to connect to TimeFly servers",
			statusCode: 0,
		};
	}
}
