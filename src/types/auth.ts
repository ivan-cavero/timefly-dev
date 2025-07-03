/**
 * User information interface
 */
export interface UserInfo {
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
}

/**
 * API key validation result
 */
export interface ApiKeyValidation {
	isValid: boolean;
	error?: string;
}

/**
 * Authentication summary for status checking
 */
export interface AuthenticationSummary {
	isAuthenticated: boolean;
	hasApiKey: boolean;
	userInfo?: UserInfo;
}
