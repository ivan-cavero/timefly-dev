export type ActivityName = 'Coding' | 'Reading' | 'Debugging' | 'AI' | 'Terminal';

export interface Activity {
    name: ActivityName;
    duration_ms: number;
    properties: Record<string, string>;
}

export type PulseMetadata = Record<string, string>;

export interface Pulse {
    event_id: string; // UUID
    user_id: string; // UUID
    project_id: string;
    event_time: string; // ISO 8601 format date string
    metadata: PulseMetadata;
    activities: Activity[];
} 