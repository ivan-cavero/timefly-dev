import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'
import { logger } from '@/utils/logger'

// Function to get the extension's version from package.json
const getExtensionVersion = (context: vscode.ExtensionContext): string => {
	try {
		return context.extension.packageJSON.version ?? '0.0.0'
	} catch (error) {
		logger.warn('Could not retrieve extension version.', error)
		return '0.0.0'
	}
}

// Function to check if the current workspace is a Git repository
const isGitRepository = async (): Promise<boolean> => {
	const workspaceFolders = vscode.workspace.workspaceFolders
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return false
	}
	// Check the first workspace folder for a .git directory
	const gitPath = path.join(workspaceFolders[0].uri.fsPath, '.git')
	try {
		const stats = await fs.stat(gitPath)
		return stats.isDirectory()
	} catch {
		// If fs.stat throws an error, it likely means the directory doesn't exist
		return false
	}
}

/**
 * Gathers and constructs the metadata object for a pulse.
 * This information provides valuable context about the environment where the activity occurred.
 *
 * @param context The VS Code extension context.
 * @returns A promise that resolves to the metadata record.
 */
export const getPulseMetadata = async (context: vscode.ExtensionContext): Promise<Record<string, string>> => {
	const metadata: Record<string, string> = {}

	// --- Hardcoded Information ---
	metadata.ide_name = 'vscode'

	// --- Dynamic Information ---
	metadata.extension_version = getExtensionVersion(context)
	metadata.os_platform = os.platform() // 'darwin', 'win32', 'linux'
	metadata.has_git_repo = String(await isGitRepository())

	logger.debug('Generated pulse metadata:', metadata)
	return metadata
}
