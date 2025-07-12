import type * as vscode from 'vscode'
import type { ActivityName } from '../activities'
import type { ActivityMetadata } from '../types'
import { registerCodingDetector } from './coding'
import { registerReadingDetector } from './reading'
import { registerDebuggingDetector } from './debugging'

export const registerAllDetectors = (
	context: vscode.ExtensionContext,
	record: (name: ActivityName, meta?: ActivityMetadata) => void
): void => {
	registerCodingDetector(context, record)
	registerReadingDetector(context, record)
	registerDebuggingDetector(context, record)
	// Future detectors (ai_usage, terminal, etc.) can be registered here with 1 línea.
} 