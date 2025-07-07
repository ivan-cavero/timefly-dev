import * as vscode from 'vscode'
import { ActivityName } from '@/types/tracking'
import { recordActivity } from '../../state'

/**
 * Initializes a file system watcher to detect file operations like create,
 * delete, and rename, which are considered part of the "Coding" activity.
 *
 * @param context The extension context to push subscriptions to.
 */
export const initFileWatcherCollector = (context: vscode.ExtensionContext) => {
	// Watch all files, but this could be scoped further if needed
	const watcher = vscode.workspace.createFileSystemWatcher('**/*')

	const onFileOperation = (uri: vscode.Uri) => {
		// We only care about file-scheme URIs, not virtual documents
		if (uri.scheme === 'file') {
			recordActivity(ActivityName.CODING)
		}
	}

	// Register handlers for file events
	watcher.onDidCreate(onFileOperation)
	watcher.onDidDelete(onFileOperation)
	watcher.onDidChange(onFileOperation) // Renaming is often seen as a change

	context.subscriptions.push(watcher)
} 