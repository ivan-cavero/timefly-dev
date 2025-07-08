// Core timing configuration
export const ACTIVITY_DETECTION_WINDOW = 10000 // 10 seconds
export const ACTIVITY_EXPIRATION_THRESHOLD = 90000 // 90 seconds (1.5 min)
export const IDLE_THRESHOLD = 90000 // 90 seconds (1.5 min)
export const INACTIVE_THRESHOLD = 60000 // 60 seconds (1 min) - After IDLE
export const PULSE_GENERATION_INTERVAL = 10000 // 10 seconds

// List of activities that count toward daily productive time
export const PRODUCTIVE_ACTIVITIES = [
	'coding',
	'debugging',
	'reading',
	'ai_usage',
	'terminal_usage'
] as const

// Status bar display priority
export const ACTIVITY_PRIORITY = {
	ai_usage: 1,
	debugging: 2,
	coding: 3,
	reading: 4,
	terminal_usage: 5,
	idle: 6,
	inactive: 7
} as const

// Syncing configuration
export const SYNC_INTERVAL = 1800000 // 30 minutes 