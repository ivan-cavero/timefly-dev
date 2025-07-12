import type { ActivityName } from './activities'

export interface ActivityMetrics {
	duration_ms: number
	properties?: Record<string, string>
}

export type ActivityMetadata = Record<string, string | number>

export interface ActivityEntry {
	name: ActivityName
	duration_ms: number
	properties: ActivityMetadata
}

export interface ActivityEvent {
	event_id: string
	user_id: string
	project_id: string
	event_time: string // ISO string in UTC
	metadata: Record<string, string>
	activities: ActivityEntry[]
} 