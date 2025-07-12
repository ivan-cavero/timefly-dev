import type * as vscode from 'vscode'
import type { AuthenticationSummary, UserInfo } from '@/types/auth'
import { logger } from '@/utils/logger'

/**
 * Storage keys for consistent access
 */
const STORAGE_KEYS = {
	// Secrets (encrypted storage)
	API_KEY: 'timefly.apiKey',

	// Global state (shared across all VS Code instances)
	USER_INFO: 'timefly.userInfo',
	IS_AUTHENTICATED: 'timefly.isAuthenticated',
	PRODUCTIVE_TIME_PREFIX: 'timefly.productiveTime.'
} as const

export type StorageService = ReturnType<typeof createStorageService>

/**
 * Storage service to manage global state, workspace state, and secrets
 */
const createStorageService = (context: vscode.ExtensionContext) => {
	// ============= API KEY MANAGEMENT (SECRETS) =============

	const storeApiKey = async (apiKey: string): Promise<void> => {
		try {
			await context.secrets.store(STORAGE_KEYS.API_KEY, apiKey)
			logger.info('API key stored securely')
		} catch (error) {
			logger.error('Failed to store API key', error)
			throw new Error('Failed to store API key securely')
		}
	}

	const getApiKey = async (): Promise<string | undefined> => {
		try {
			const apiKey = await context.secrets.get(STORAGE_KEYS.API_KEY)
			return apiKey
		} catch (error) {
			logger.error('Failed to retrieve API key', error)
			return undefined
		}
	}

	const deleteApiKey = async (): Promise<void> => {
		try {
			await context.secrets.delete(STORAGE_KEYS.API_KEY)
			logger.info('API key deleted from secure storage')
		} catch (error) {
			logger.error('Failed to delete API key', error)
			throw new Error('Failed to delete API key')
		}
	}

	// ============= USER INFO MANAGEMENT (GLOBAL STATE) =============

	const storeUserInfo = async (userInfo: UserInfo): Promise<void> => {
		try {
			await context.globalState.update(STORAGE_KEYS.USER_INFO, userInfo)
			await context.globalState.update(STORAGE_KEYS.IS_AUTHENTICATED, true)
			logger.info(`User info stored for: ${userInfo.email}`)
		} catch (error) {
			logger.error('Failed to store user info', error)
			throw new Error('Failed to store user information')
		}
	}

	const getUserInfo = (): UserInfo | undefined => {
		try {
			return context.globalState.get<UserInfo>(STORAGE_KEYS.USER_INFO)
		} catch (error) {
			logger.error('Failed to retrieve user info', error)
			return undefined
		}
	}

	const isAuthenticated = (): boolean => {
		try {
			return context.globalState.get<boolean>(STORAGE_KEYS.IS_AUTHENTICATED, false)
		} catch (error) {
			logger.error('Failed to check authentication status', error)
			return false
		}
	}

	// ============= UTILITY METHODS =============

	const getDateKey = (date: Date): string => {
		return date.toISOString().split('T')[0] // YYYY-MM-DD
	}

	const getProductiveTime = (date: Date): number => {
		const key = `${STORAGE_KEYS.PRODUCTIVE_TIME_PREFIX}${getDateKey(date)}`
		return context.globalState.get<number>(key, 0)
	}

	const storeProductiveTime = async (date: Date, ms: number): Promise<void> => {
		const key = `${STORAGE_KEYS.PRODUCTIVE_TIME_PREFIX}${getDateKey(date)}`
		await context.globalState.update(key, ms)
	}

	const clearAllData = async (): Promise<void> => {
		try {
			// Clear secrets
			await deleteApiKey()

			// Clear global state
			await context.globalState.update(STORAGE_KEYS.USER_INFO, undefined)
			await context.globalState.update(STORAGE_KEYS.IS_AUTHENTICATED, false)

			logger.info('All stored data cleared')
		} catch (error) {
			logger.error('Failed to clear all data', error)
			throw new Error('Failed to clear stored data')
		}
	}

	const getAuthenticationSummary = async (): Promise<AuthenticationSummary> => {
		const authStatus = isAuthenticated()
		const hasApiKey = (await getApiKey()) !== undefined
		const userInfo = getUserInfo()

		return {
			isAuthenticated: authStatus,
			hasApiKey,
			userInfo
		}
	}

	return {
		storeApiKey,
		getApiKey,
		deleteApiKey,
		storeUserInfo,
		getUserInfo,
		isAuthenticated,
		clearAllData,
		getAuthenticationSummary,
		getProductiveTime,
		storeProductiveTime
	}
}

// Global storage service instance
let _storageService: StorageService | null = null

/**
 * Initialize the global storage service
 */
export const initStorageService = (context: vscode.ExtensionContext): StorageService => {
	_storageService = createStorageService(context)
	return _storageService
}

/**
 * Get the global storage service instance
 */
export const getStorageService = (): StorageService => {
	if (!_storageService) {
		throw new Error('Storage service not initialized. Call initStorageService first.')
	}
	return _storageService
}

// Export for compatibility
export const storageService = {
	get instance(): StorageService {
		return getStorageService()
	}
}
