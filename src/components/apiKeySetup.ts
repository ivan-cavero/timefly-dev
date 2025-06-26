import * as vscode from 'vscode';
import { info, debug, logger } from '@/utils/logger';
import { trackApiKeySetup } from '@/utils/telemetry';

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

export async function handleApiKeyConfiguration(): Promise<void> {
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

		if (apiKey) {
			const validation = validateApiKeyFormat(apiKey);
			
			if (!validation.isValid) {
				await trackApiKeySetup(false, `validation_failed: ${validation.error}`);
				vscode.window.showErrorMessage(`❌ Invalid API key: ${validation.error}`);
				return;
			}

			// TODO: Here we could add a backend validation call
			// const isValidOnBackend = await validateApiKeyWithBackend(apiKey);
			
			// Store the API key (TODO: implement secure storage)
			info('API key configured successfully');
			await trackApiKeySetup(true);
			vscode.window.showInformationMessage('✅ API key configured successfully!');
			
		} else {
			// User cancelled or entered empty key
			debug('API key configuration cancelled');
			await trackApiKeySetup(false, 'user_cancelled');
		}
	} catch (error) {
		logger.error('Error during API key configuration', error);
		await trackApiKeySetup(false, error instanceof Error ? error.message : 'unknown_error');
		vscode.window.showErrorMessage('Failed to configure API key. Please try again.');
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