export const ACTIVITY_DEFINITIONS = {
	coding: {
		friendlyName: 'Coding',
		icon: '💻',
		productive: true,
		priority: 3
	},
	debugging: {
		friendlyName: 'Debugging',
		icon: '🐛',
		productive: true,
		priority: 2
	},
	reading: {
		friendlyName: 'Reading',
		icon: '📖',
		productive: true,
		priority: 4
	},
	idle: {
		friendlyName: 'Idle',
		icon: '😴',
		productive: false,
		priority: 6
	},
	inactive: {
		friendlyName: 'Inactive',
		icon: '💤',
		productive: false,
		priority: 7
	}
} as const

export type ActivityName = keyof typeof ACTIVITY_DEFINITIONS

export const PRODUCTIVE_ACTIVITIES = (Object.keys(ACTIVITY_DEFINITIONS) as ActivityName[]).filter(
	(name) => ACTIVITY_DEFINITIONS[name].productive
)

export const ACTIVITY_PRIORITY: Record<ActivityName, number> = Object.fromEntries(
	(Object.keys(ACTIVITY_DEFINITIONS) as ActivityName[]).map((name) => [
		name,
		ACTIVITY_DEFINITIONS[name].priority
	])
) as Record<ActivityName, number> 