import type { ACTIVITY_PRIORITY, PRODUCTIVE_ACTIVITIES } from './constants'

/**
 * The name of a possible activity. Derived from the priority mapping.
 */
export type ActivityName = keyof typeof ACTIVITY_PRIORITY

/**
 * An activity that is considered productive time.
 */
export type ProductiveActivity = (typeof PRODUCTIVE_ACTIVITIES)[number]

/**
 * Represents a single activity recorded within a 10-second pulse.
 * This structure corresponds to the `activities` Nested data type in ClickHouse.
 */
export interface Activity {
	/** The name of the activity (e.g., 'coding', 'debugging'). */
	name: ActivityName
	/** The duration of this activity within the 10-second window, in milliseconds. */
	duration_ms: number
	/** A flexible key-value store for activity-specific metrics. */
	properties: Record<string, string>
}

/**
 * Represents a 10-second pulse of developer activity.
 * This is the central data structure that will be sent to the TimeFly server.
 * It corresponds to the `activity_events` table in ClickHouse.
 */
export interface Pulse {
	/** A unique UUID (v4) for this 10-second pulse. */
	event_id: string
	/** The user's unique identifier. */
	user_id: string
	/** The project identifier (e.g., Git repository name). */
	project_id: string
	/** The start time of the 10s window (ISO 8601 format, UTC). */
	event_time: string
	/** A flexible key-value store for contextual information (e.g., IDE version, OS). */
	metadata: Record<string, string>
	/** An array of activities that occurred within this pulse. */
	activities: Activity[]
}

/**
 * A generic base for raw events captured from collectors.
 */
interface BaseEvent<T extends string, P extends Record<string, unknown> = Record<string, unknown>> {
	/** The timestamp of when the event occurred (Unix epoch, milliseconds). */
	timestamp: number
	/** The type of event, indicating its source. */
	type: T
	/** The payload containing event-specific data. */
	payload: P
}

// --- Specific Event Payloads & Types ---

export type DocumentChangeEvent = BaseEvent<
	'document',
	{
		action: 'change'
		languageId: string
		linesAdded: number
		linesDeleted: number
		charsAdded: number
	}
>

export type DocumentSelectionEvent = BaseEvent<
	'document',
	{
		action: 'selection'
		languageId: string
	}
>

export type DocumentScrollEvent = BaseEvent<
	'document',
	{
		action: 'scroll'
		languageId: string
	}
>

export type FileOperationEvent = BaseEvent<
	'file',
	{
		action: 'create' | 'delete' | 'rename' | 'switch'
		fileName?: string
	}
>

export type DebugEvent = BaseEvent<
	'debug',
	{
		action: 'start' | 'stop'
		debugType: string
	}
>

export type TerminalEvent = BaseEvent<
	'terminal',
	{
		action: 'open' | 'write'
	}
>

export type AiEvent = BaseEvent<'ai', { action: 'interaction' }>
export type SystemEvent = BaseEvent<'system', { action: 'start' | 'stop' }>

/**
 * Represents a raw event captured from a collector before classification.
 * This is a union of all possible specific event types.
 */
export type RawEvent =
	| DocumentChangeEvent
	| DocumentSelectionEvent
	| DocumentScrollEvent
	| FileOperationEvent
	| DebugEvent
	| TerminalEvent
	| AiEvent
	| SystemEvent

/**
 * Represents the daily summary of productive time.
 * This is stored to persist time across sessions.
 */
export interface DailySummary {
	/** The date for this summary in YYYY-MM-DD format. */
	date: string
	/** Total productive time in milliseconds for this day. */
	productiveTimeMs: number
}

/**
 * Represents an activity that has been identified by the classifier and is currently active.
 */
export interface ActiveActivity {
	name: ActivityName
	startedAt: number
	lastEventAt: number
	properties: Record<string, string>
} 