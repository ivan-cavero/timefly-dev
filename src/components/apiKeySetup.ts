import * as vscode from 'vscode';
import { info, debug, logger } from '@/utils/logger';
import { trackApiKeySetup } from '@/utils/telemetry';
import { API_CONFIG } from '@/config/api';

/**
 * Validate API key format based on backend generation:
 * UUID v7 + hexadecimal hash (e.g., 01234567-1234-7abc-9def-123456789abc1a2b3c4d5e6f7890abcd)
 */
function validateApiKeyFormat(apiKey: string): { isValid: boolean; error?: string } {
	if (!apiKey || apiKey.trim().length === 0) {
		return { isValid: false, error: 'API key cannot be empty' };
	}

	// Remove any whitespace
	const cleanKey = apiKey.trim();

	// Basic length check - UUID v7 (36 chars) + hash (variable length, typically 16+ chars)
	if (cleanKey.length < 52) {
		return { isValid: false, error: 'API key is too short. Expected format: UUID + hash' };
	}

	// Check if it starts with UUID v7 format (xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx)
	const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
	if (!uuidV7Pattern.test(cleanKey)) {
		return { isValid: false, error: 'Invalid API key format. Must start with UUID v7' };
	}

	// Check if the rest is hexadecimal
	const afterUuid = cleanKey.substring(36);
	const hexPattern = /^[0-9a-f]+$/i;
	if (!hexPattern.test(afterUuid)) {
		return { isValid: false, error: 'Invalid API key format. Hash portion must be hexadecimal' };
	}

	return { isValid: true };
}

/**
 * Backend API key validation response types
 */
interface ApiKeyValidationResponse {
	valid: boolean;
	user: {
		uuid: string;
		email: string;
		name: string;
		avatarUrl?: string;
		createdAt: string;
		updatedAt: string;
		providerIdentities: Array<{
			provider: string;
			providerUserId: string;
		}>;
	};
	apiKeyUuid: string;
}

interface ApiKeyValidationError {
	error: string;
	message: string;
}

/**
 * Validate API key with TimeFly backend
 */
async function validateApiKeyWithBackend(apiKey: string): Promise<{ isValid: boolean; user?: any; error?: string; statusCode?: number }> {
	try {
		const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERIFY_API_KEY()}`;
		
		logger.debug(`Validating API key with backend: ${url}`);
		
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE
			},
			body: JSON.stringify({})
		});

		const statusCode = response.status;

		if (response.ok) {
			const data = await response.json() as ApiKeyValidationResponse;
			info('API key validated successfully with backend');
			return { 
				isValid: data.valid, 
				user: data.user,
				statusCode 
			};
		} else {
			let errorMessage = 'Unknown error';
			
			try {
				const errorData = await response.json() as ApiKeyValidationError;
				errorMessage = errorData.message || errorData.error || 'Unknown error';
			} catch {
				// If can't parse JSON, use status text
				errorMessage = response.statusText || 'Unknown error';
			}

			logger.warn(`API key validation failed: ${statusCode} - ${errorMessage}`);
			
			return { 
				isValid: false, 
				error: errorMessage,
				statusCode 
			};
		}
	} catch (error) {
		logger.error('Network error during API key validation', error);
		return { 
			isValid: false, 
			error: 'Network error: Unable to connect to TimeFly servers',
			statusCode: 0 
		};
	}
}

/**
 * Show error message with retry option
 */
async function showErrorWithRetry(message: string, shouldRetry: boolean = true): Promise<boolean> {
	const retryButton = 'Try Again';
	const cancelButton = 'Cancel';
	
	const selection = await vscode.window.showErrorMessage(
		message,
		...(shouldRetry ? [retryButton, cancelButton] : [cancelButton])
	);
	
	return selection === retryButton;
}

/**
 * Get user-friendly error message based on status code
 */
function getErrorMessage(statusCode: number, error: string): { message: string; shouldRetry: boolean } {
	switch (statusCode) {
		case 401:
			return {
				message: '🔐 Invalid API key. Please check your API key and try again.',
				shouldRetry: true
			};
		case 404:
			return {
				message: '👤 User not found. This API key may be associated with a deleted account.',
				shouldRetry: true
			};
		case 500:
			return {
				message: '🔧 Server error. TimeFly servers are experiencing issues. Please try again later.',
				shouldRetry: true
			};
		case 0:
			return {
				message: '🌐 Connection failed. Please check your internet connection and try again.',
				shouldRetry: true
			};
		default:
			return {
				message: `❌ Validation failed: ${error}`,
				shouldRetry: true
			};
	}
}

export async function handleApiKeyConfiguration(): Promise<void> {
	let shouldContinue = true;
	
	while (shouldContinue) {
		try {
			const apiKey = await vscode.window.showInputBox({
				prompt: 'Enter your TimeFly API Key',
				password: true,
				ignoreFocusOut: true,
				placeHolder: 'e.g., 01234567-1234-7abc-9def-123456789abc1a2b3c4d5e6f7890abcd',
				validateInput: (value) => {
					if (!value) return null; // Allow empty during typing
					const validation = validateApiKeyFormat(value);
					return validation.isValid ? null : validation.error;
				}
			});

			if (!apiKey) {
				// User cancelled or entered empty key
				debug('API key configuration cancelled');
				await trackApiKeySetup(false, 'user_cancelled');
				shouldContinue = false;
				return;
			}

			const validation = validateApiKeyFormat(apiKey);
			
			if (!validation.isValid) {
				await trackApiKeySetup(false, `validation_failed: ${validation.error}`);
				vscode.window.showErrorMessage(`❌ Invalid API key format: ${validation.error}`);
				continue; // Ask for API key again
			}

			// Show progress while validating with backend
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "⏳ Validating API key with TimeFly...",
				cancellable: false
			}, async () => {
				const backendValidation = await validateApiKeyWithBackend(apiKey);
				
				if (backendValidation.isValid && backendValidation.user) {
					// Success! Store the API key and show success message
					// TODO: Implement secure storage
					info('API key configured successfully');
					await trackApiKeySetup(true);
					
					const userName = backendValidation.user.name || backendValidation.user.email || 'Developer';
					const successMessage = `🚀 Welcome ${userName}! Your API key is configured and TimeFly is now tracking your coding time.`;
					
					vscode.window.showInformationMessage(successMessage);
					shouldContinue = false;
				} else {
					// Validation failed
					const { message, shouldRetry } = getErrorMessage(
						backendValidation.statusCode || 0, 
						backendValidation.error || 'Unknown error'
					);
					
					await trackApiKeySetup(false, `backend_validation_failed: ${backendValidation.statusCode} - ${backendValidation.error}`);
					
					const retry = await showErrorWithRetry(message, shouldRetry);
					shouldContinue = retry;
				}
			});
			
		} catch (error) {
			logger.error('Error during API key configuration', error);
			await trackApiKeySetup(false, error instanceof Error ? error.message : 'unknown_error');
			
			const retry = await showErrorWithRetry(
				'❌ An unexpected error occurred. Please try again.'
			);
			shouldContinue = retry;
		}
	}
}

// TODO: Implement backend validation
/*
async function validateApiKeyWithBackend(apiKey: string): Promise<boolean> {
	try {
		// Call TimeFly backend to validate the API key
		const response = await fetch('https://api.timefly.dev/validate-key', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ apiKey })
		});
		return response.ok;
	} catch (error) {
		logger.error('Failed to validate API key with backend', error);
		return false;
	}
}
*/ 