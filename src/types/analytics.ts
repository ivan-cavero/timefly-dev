/**
 * Represents a collection of properties for an analytics event.
 * Using `unknown` is safer than `any` as it requires type checking.
 */
export type AnalyticsProperties = Record<string, unknown>; 