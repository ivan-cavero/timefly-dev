import * as vscode from 'vscode'

/**
 * Gets a project identifier for the current workspace.
 * It uses the name of the first workspace folder as the project ID.
 * Returns 'unknown_project' if no folder is open.
 */
export const getProjectId = async (): Promise<string> => {
	const folders = vscode.workspace.workspaceFolders
	if (folders && folders.length > 0) {
		// A simple and effective way to get a project name
		return folders[0].name
	}

	// Fallback for when no folder is open
	return 'unknown_project'
} 