import * as vscode from 'vscode'
import { logger } from '@/utils/logger'

let hasGitRepo = false

/**
 * Initializes the Git collector by searching for a .git directory in the workspace.
 * This runs once at startup for efficiency.
 */
export const initGitCollector = async (): Promise<void> => {
	try {
		// Use findFiles for a fast, non-blocking search.
		// Exclude node_modules and search for just one file to be efficient.
		const gitConfigFiles = await vscode.workspace.findFiles('**/.git/config', '**/node_modules/**', 1)
		if (gitConfigFiles.length > 0) {
			hasGitRepo = true
			logger.info('Git repository detected in the workspace.')
		} else {
			hasGitRepo = false
			logger.info('No Git repository detected in the workspace.')
		}
	} catch (error) {
		logger.error('Failed to run git collector search', error)
		hasGitRepo = false // Assume no repo on error
	}
}

/**
 * Defines the shape of the Git metadata.
 */
export interface GitData {
	has_git_repo: 'true' | 'false'
}

/**
 * Collects the git repository presence data.
 * The value is determined by the initGitCollector.
 *
 * @returns {GitData} An object indicating if a git repo is present.
 */
export const collectGitData = (): GitData => {
	return {
		has_git_repo: hasGitRepo ? 'true' : 'false'
	}
} 