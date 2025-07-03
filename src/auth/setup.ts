import * as vscode from "vscode";
import { getStorageService } from "@/services/storage";
import { debug, info, logger } from "@/utils/logger";
import { trackApiKeySetup } from "@/utils/telemetry";
import { validateApiKeyWithBackend } from "./backend";
import { validateApiKeyFormat } from "./validator";
import { statusBar } from "@/components/statusBar";
import { StatusBarState } from "@/types/statusBar";

/**
 * Show error message with retry option
 */
async function showErrorWithRetry(
	message: string,
	shouldRetry: boolean = true,
): Promise<boolean> {
	const retryButton = "Try Again";
	const cancelButton = "Cancel";

	const selection = await vscode.window.showErrorMessage(
		message,
		...(shouldRetry ? [retryButton, cancelButton] : [cancelButton]),
	);

	return selection === retryButton;
}

/**
 * Get user-friendly error message based on status code
 */
function getErrorMessage(
	statusCode: number,
	error: string,
): { message: string; shouldRetry: boolean } {
	switch (statusCode) {
		case 401:
			return {
				message: "🔐 Invalid API key. Please check your API key and try again.",
				shouldRetry: true,
			};
		case 404:
			return {
				message:
					"👤 User not found. This API key may be associated with a deleted account.",
				shouldRetry: true,
			};
		case 500:
			return {
				message:
					"🔧 Server error. TimeFly servers are experiencing issues. Please try again later.",
				shouldRetry: true,
			};
		case 0:
			return {
				message:
					"🌐 Connection failed. Please check your internet connection and try again.",
				shouldRetry: true,
			};
		default:
			return {
				message: `❌ Validation failed: ${error}`,
				shouldRetry: true,
			};
	}
}

/**
 * Handle API key configuration flow
 * If an API key already exists, it will be replaced with the new one
 */
export async function configureApiKey(): Promise<void> {
	let shouldContinue = true;

	while (shouldContinue) {
		try {
			const apiKey = await vscode.window.showInputBox({
				prompt: "Enter your TimeFly API Key",
				password: true,
				ignoreFocusOut: true,
				placeHolder:
					"e.g., 01234567-1234-7abc-9def-123456789abc1a2b3c4d5e6f7890abcd",
				validateInput: (value) => {
					if (!value) return null; // Allow empty during typing
					const validation = validateApiKeyFormat(value);
					return validation.isValid ? null : validation.error;
				},
			});

			if (!apiKey) {
				// User cancelled or entered empty key
				debug("API key configuration cancelled");
				await trackApiKeySetup(false, "user_cancelled");
				shouldContinue = false;
				return;
			}

			const validation = validateApiKeyFormat(apiKey);

			if (!validation.isValid) {
				await trackApiKeySetup(false, `validation_failed: ${validation.error}`);
				vscode.window.showErrorMessage(
					`❌ Invalid API key format: ${validation.error}`,
				);
				continue; // Ask for API key again
			}

			// Show progress while validating with backend
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: "⏳ Validating API key with TimeFly...",
					cancellable: false,
				},
				async () => {
					const backendValidation = await validateApiKeyWithBackend(apiKey);

					if (backendValidation.isValid && backendValidation.user) {
						// Success! Store the API key and user info securely
						try {
							const storage = getStorageService();
							await storage.storeApiKey(apiKey);
							await storage.storeUserInfo(backendValidation.user);
							statusBar.update(StatusBarState.AUTHENTICATED);

							info("API key and user info stored successfully");
							await trackApiKeySetup(true);

							const userName =
								backendValidation.user.name ||
								backendValidation.user.email ||
								"Developer";
							const successMessage = `🚀 Welcome ${userName}! Your API key is configured and TimeFly is now tracking your coding time.`;

							vscode.window.showInformationMessage(successMessage);
							shouldContinue = false;
						} catch (storageError) {
							logger.error(
								"Failed to store API key or user info",
								storageError,
							);
							await trackApiKeySetup(
								false,
								`storage_failed: ${storageError instanceof Error ? storageError.message : "unknown_error"}`,
							);

							const retry = await showErrorWithRetry(
								"🔐 Failed to securely store your API key. Please try again.",
							);
							shouldContinue = retry;
						}
					} else {
						// Validation failed
						const { message, shouldRetry } = getErrorMessage(
							backendValidation.statusCode || 0,
							backendValidation.error || "Unknown error",
						);

						await trackApiKeySetup(
							false,
							`backend_validation_failed: ${backendValidation.statusCode} - ${backendValidation.error}`,
						);

						const retry = await showErrorWithRetry(message, shouldRetry);
						shouldContinue = retry;
					}
				},
			);
		} catch (error) {
			logger.error("Error during API key configuration", error);
			await trackApiKeySetup(
				false,
				error instanceof Error ? error.message : "unknown_error",
			);

			const retry = await showErrorWithRetry(
				"❌ An unexpected error occurred. Please try again.",
			);
			shouldContinue = retry;
		}
	}
}
