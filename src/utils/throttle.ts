/**
 * Simple debounce helper. Subsequent calls within `ms` delay cancel the previous schedule and start over.
 * Useful for coalescing high-frequency events (scroll, text changes, selections…).
 */
export const createDebounce = <T extends unknown[]>(fn: (...args: T) => void, ms: number) => {
	let timer: NodeJS.Timeout | null = null
	return (...args: T): void => {
		if (timer) {
			clearTimeout(timer)
		}
		timer = setTimeout(() => {
			fn(...args)
		}, ms)
	}
} 