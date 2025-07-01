/**
 * Workspace-specific settings interface
 */
export interface WorkspaceSettings {
	[key: string]: any;
}

/**
 * Storage validation result
 */
export interface StorageValidationResult {
	isValid: boolean;
	issues?: string[];
}
