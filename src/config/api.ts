export const API_CONFIG = {
	// Use environment variable for production, default to localhost for development
	BASE_URL: process.env.TIMEFLY_API_URL || "http://localhost:3001",
	ENDPOINTS: {
		VERIFY_API_KEY: () => `/api/api-keys/verify`,
	},
	HEADERS: {
		CONTENT_TYPE: "application/json",
	},
	TIMEOUT: 10000, // 10 seconds
} as const;
