import { getStorageService } from "@/services/storage";
import type { AuthenticationSummary } from "@/types/auth";
import { logger } from "@/utils/logger";

/**
 * Get current authentication state
 */
async function getAuthenticationState(): Promise<AuthenticationSummary> {
	try {
		const storage = getStorageService();
		return await storage.getAuthenticationSummary();
	} catch (error) {
		logger.error("Error getting authentication state", error);
		return {
			isAuthenticated: false,
			hasApiKey: false,
		};
	}
}

/**
 * Check if user is currently authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
	try {
		const authState = await getAuthenticationState();
		return (
			authState.isAuthenticated && authState.hasApiKey && !!authState.userInfo
		);
	} catch (error) {
		logger.error("Error checking authentication status", error);
		return false;
	}
}

/**
 * Clear all authentication data (logout)
 */
export async function clearAuthenticationData(): Promise<void> {
	try {
		const storage = getStorageService();
		await storage.clearAllData();
	} catch (error) {
		logger.error("Error clearing authentication data", error);
		throw new Error("Failed to clear authentication data");
	}
}
