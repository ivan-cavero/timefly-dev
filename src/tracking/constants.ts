export const ACTIVITY_DETECTION_WINDOW = 10_000 // 10 seconds
export const ACTIVITY_EXPIRATION_THRESHOLD = 90_000 // 90 seconds (1.5 min)
export const IDLE_THRESHOLD = 90_000 // 90 seconds (1.5 min)
export const INACTIVE_THRESHOLD = 60_000 // 60 seconds (1 min)
export const PULSE_GENERATION_INTERVAL = 6_500 // 6.5 seconds

// Debounce time to coalesce rapid detector events
export const DETECTOR_DEBOUNCE_MS = 250

// Backend sync interval – events buffered locally and sent every 30 min
export const SYNC_INTERVAL = 15 * 60 * 1000 // 15 minutes
// Activity-related constants have moved to activities.ts to keep structure scalable 