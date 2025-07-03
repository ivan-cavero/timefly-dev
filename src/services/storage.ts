import type * as vscode from "vscode";
import type { AuthenticationSummary, UserInfo } from "@/types/auth";
import { logger } from "@/utils/logger";
import { Pulse } from "@/types/pulse";

/**
 * Storage keys for consistent access
 */
const STORAGE_KEYS = {
	// Secrets (encrypted storage)
	API_KEY: "timefly.apiKey",

	// Global state (shared across all VS Code instances)
	USER_INFO: "timefly.userInfo",
	IS_AUTHENTICATED: "timefly.isAuthenticated",
	PULSE_QUEUE: "timefly.pulseQueue",
} as const;

/**
 * Storage service to manage global state, workspace state, and secrets
 */
export class StorageService {
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	// ============= API KEY MANAGEMENT (SECRETS) =============

	/**
	 * Store API key securely
	 */
	async storeApiKey(apiKey: string): Promise<void> {
		try {
			await this.context.secrets.store(STORAGE_KEYS.API_KEY, apiKey);
			logger.info("API key stored securely");
		} catch (error) {
			logger.error("Failed to store API key", error);
			throw new Error("Failed to store API key securely");
		}
	}

	/**
	 * Retrieve API key from secure storage
	 */
	async getApiKey(): Promise<string | undefined> {
		try {
			const apiKey = await this.context.secrets.get(STORAGE_KEYS.API_KEY);
			return apiKey;
		} catch (error) {
			logger.error("Failed to retrieve API key", error);
			return undefined;
		}
	}

	/**
	 * Delete API key from secure storage
	 */
	async deleteApiKey(): Promise<void> {
		try {
			await this.context.secrets.delete(STORAGE_KEYS.API_KEY);
			logger.info("API key deleted from secure storage");
		} catch (error) {
			logger.error("Failed to delete API key", error);
			throw new Error("Failed to delete API key");
		}
	}

	// ============= USER INFO MANAGEMENT (GLOBAL STATE) =============

	/**
	 * Store user information in global state
	 */
	async storeUserInfo(userInfo: UserInfo): Promise<void> {
		try {
			await this.context.globalState.update(STORAGE_KEYS.USER_INFO, userInfo);
			await this.context.globalState.update(
				STORAGE_KEYS.IS_AUTHENTICATED,
				true,
			);
			logger.info(`User info stored for: ${userInfo.email}`);
		} catch (error) {
			logger.error("Failed to store user info", error);
			throw new Error("Failed to store user information");
		}
	}

	/**
	 * Retrieve user information from global state
	 */
	getUserInfo(): UserInfo | undefined {
		try {
			return this.context.globalState.get<UserInfo>(STORAGE_KEYS.USER_INFO);
		} catch (error) {
			logger.error("Failed to retrieve user info", error);
			return undefined;
		}
	}

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean {
		try {
			return this.context.globalState.get<boolean>(
				STORAGE_KEYS.IS_AUTHENTICATED,
				false,
			);
		} catch (error) {
			logger.error("Failed to check authentication status", error);
			return false;
		}
	}

	// ============= UTILITY METHODS =============

	/**
	 * Clear all stored data (logout)
	 */
	async clearAllData(): Promise<void> {
		try {
			// Clear secrets
			await this.deleteApiKey();

			// Clear global state
			await this.context.globalState.update(STORAGE_KEYS.USER_INFO, undefined);
			await this.context.globalState.update(
				STORAGE_KEYS.IS_AUTHENTICATED,
				false,
			);

			// Clear pulse queue
			await this.clearPulses();

			logger.info("All stored data cleared");
		} catch (error) {
			logger.error("Failed to clear all data", error);
			throw new Error("Failed to clear stored data");
		}
	}

	/**
	 * Get authentication summary
	 */
	async getAuthenticationSummary(): Promise<AuthenticationSummary> {
		const isAuthenticated = this.isAuthenticated();
		const hasApiKey = (await this.getApiKey()) !== undefined;
		const userInfo = this.getUserInfo();

		return {
			isAuthenticated,
			hasApiKey,
			userInfo,
		};
	}

	/**
	 * Validate stored data integrity
	 */
	async validateStoredData(): Promise<boolean> {
		try {
			const isAuth = this.isAuthenticated();
			const hasApiKey = (await this.getApiKey()) !== undefined;
			const hasUserInfo = this.getUserInfo() !== undefined;

			// All should be consistent
			const isValid =
				(isAuth && hasApiKey && hasUserInfo) ||
				(!isAuth && !hasApiKey && !hasUserInfo);

			if (!isValid) {
				logger.warn("Stored data integrity check failed - inconsistent state");
				// Could auto-repair here by clearing inconsistent data
			}

			return isValid;
		} catch (error) {
			logger.error("Failed to validate stored data", error);
			return false;
		}
	}

	// ============= PULSE QUEUE MANAGEMENT (GLOBAL STATE) =============

	/**
	 * Adds a pulse to the persistent queue.
	 */
	async addPulse(pulse: Pulse): Promise<void> {
		try {
			const currentQueue = await this.getPulses();
			currentQueue.push(pulse);
			await this.context.globalState.update(STORAGE_KEYS.PULSE_QUEUE, currentQueue);
		} catch (error) {
			logger.error("Failed to add pulse to queue", error);
		}
	}

	/**
	 * Retrieves all pulses from the persistent queue.
	 */
	async getPulses(): Promise<Pulse[]> {
		try {
			// Get from storage, defaulting to an empty array if not present
			return this.context.globalState.get<Pulse[]>(STORAGE_KEYS.PULSE_QUEUE, []);
		} catch (error) {
			logger.error("Failed to get pulses from queue", error);
			return []; // Return empty array on error
		}
	}

	/**
	 * Clears all pulses from the persistent queue.
	 */
	async clearPulses(): Promise<void> {
		try {
			await this.context.globalState.update(STORAGE_KEYS.PULSE_QUEUE, undefined);
		} catch (error) {
			logger.error("Failed to clear pulse queue", error);
		}
	}
}

// Global storage service instance
let _storageService: StorageService | null = null;

/**
 * Initialize the global storage service
 */
export function initStorageService(
	context: vscode.ExtensionContext,
): StorageService {
	_storageService = new StorageService(context);
	return _storageService;
}

/**
 * Get the global storage service instance
 */
export function getStorageService(): StorageService {
	if (!_storageService) {
		throw new Error(
			"Storage service not initialized. Call initStorageService first.",
		);
	}
	return _storageService;
}

// Export for compatibility
export const storageService = {
	get instance(): StorageService {
		return getStorageService();
	},
};
