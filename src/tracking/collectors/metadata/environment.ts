import * as vscode from 'vscode'

/**
 * Defines the shape of the static environment data.
 */
export interface EnvironmentData {
	extension_version: string
	ide_name: string
	os_platform: string
}

/**
 * Collects static environment data that does not change during a session.
 * This includes the extension version, IDE name, and operating system.
 *
 * @returns {EnvironmentData} An object containing the environment data.
 */
export const collectEnvironmentData = (): EnvironmentData => {
	return {
		extension_version: vscode.extensions.getExtension('timefly.timefly-dev')?.packageJSON.version ?? 'unknown',
		ide_name: vscode.env.appName,
		os_platform: process.platform
	}
} 