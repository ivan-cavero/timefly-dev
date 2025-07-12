export type MetaRecord = Record<string, string | number>

/**
 * Merge two meta objects.
 * - Numeric values are added together.
 * - String values: the most recent value wins.
 */
export const mergeMeta = (a: MetaRecord, b: MetaRecord): MetaRecord => {
	const result: MetaRecord = { ...a }
	for (const [key, val] of Object.entries(b)) {
		const existing = result[key]
		if (typeof existing === 'number' && typeof val === 'number') {
			result[key] = existing + val
		} else {
			result[key] = val
		}
	}
	return result
} 