/**
 * This file defines the core data structures for the TimeFly activity tracking system.
 * The structures are based on the schema outlined in the ClickHouse architecture document.
 */

/**
 * Represents the name of a trackable activity.
 * Using a string enum for flexibility and readability.
 */
export enum ActivityName {
	CODING = 'Coding',
	READING = 'Reading',
	DEBUGGING = 'Debugging',
	AI = 'AI',
	TERMINAL = 'Terminal',
	IDLE = 'Idle',
	INACTIVE = 'Inactive'
}

/**
 * A flexible key-value map for activity-specific properties.
 * All values are stored as strings, as per the database schema.
 *
 * @example
 * // For a 'Coding' activity:
 * {
 *   'lines_added': '15',
 *   'lines_deleted': '3',
 *   'chars_typed': '310',
 *   'language': 'typescript'
 * }
 */
export type ActivityProperties = Record<string, string>

/**
 * Represents a single, distinct activity that occurred within a 10-second window.
 */
export interface Activity {
	name: ActivityName
	duration_ms: number
	properties: ActivityProperties
}

// ============================================================================
// RAW COLLECTOR DATA
// These interfaces define the raw data shapes that each granular collector
// returns. They are then processed by the "Activity" modules.
// ============================================================================

/**
 * Data from the typing collector (keystrokes, line changes).
 */
export interface CodingTypingData {
	lines_added: number
	lines_deleted: number
	chars_typed: number
}

/**
 * Data from the language collector.
 */
export interface CodingLanguageData {
	language: string
}

/**
 * Data from the debug session collector.
 */
export interface DebuggingStateData {
	is_debugging: boolean
	debugger_type: string
}

/**
 * Data from the active editor collector, used for reading activity.
 */
export interface ActiveEditorData {
	is_reading: boolean
	language?: string
}

// ============================================================================
// PULSE & STATS
// ============================================================================

/**
 * A flexible key-value map for contextual metadata for a pulse.
 * All values are stored as strings.
 *
 * @example
 * {
 *   'extension_version': '1.2.3',
 *   'ide_name': 'vscode',
 *   'os_platform': 'win32',
 *   'machine_id': '...'
 * }
 */
export type PulseMetadata = Record<string, string>

/**
 * Represents a 10-second "pulse" of developer activity, which is the
 * fundamental unit of data sent to the backend.
 */
export interface Pulse {
	event_id: string // UUID
	user_id: string // UUID
	project_id: string
	event_time: string // ISO 8601 format (e.g., "2024-07-04T10:00:10.000Z")
	metadata: PulseMetadata
	activities: Activity[]
}

/**
 * Defines the structure for aggregated tracking statistics.
 * This is stored locally to provide persistent, cross-session metrics
 * for the user (e.g., in the status bar).
 */
export interface TrackingStats {
	total_coding_ms: number
	total_reading_ms: number
	total_debugging_ms: number
	last_updated: string // ISO 8601 format
} 