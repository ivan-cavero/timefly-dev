/**
 * An ActivityContributor is a highly-focused module that detects a specific
 * micro-activity (like typing) and provides its associated properties.
 * Multiple contributors can be combined to form a single, high-level Activity.
 */
export interface ActivityContributor {
    name: string;
    
    /**
     * If the micro-activity is currently active, this should return a record
     * of its specific properties. Otherwise, it should return null.
     */
    getProperties(): Record<string, string> | null;

    initialize(): void;
    dispose(): void;
} 