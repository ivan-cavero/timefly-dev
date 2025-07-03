import { Activity, ActivityName } from '../types/pulse';
import { ActivityTracker } from './base';
import { ActivityContributor } from './contributors/base';
import { typingContributor } from './contributors/typing';
import { logger } from '../utils/logger';

// The duration of a pulse in milliseconds.
const PULSE_DURATION_MS = 10000;

class CodingActivityTracker implements ActivityTracker {
    public name: ActivityName = 'Coding';

    // This tracker aggregates data from multiple, more specific contributors.
    private contributors: ActivityContributor[] = [
        typingContributor,
        // To add more detail to the Coding activity, just add a new contributor here.
        // e.g., gitCommitContributor, terminalCommandContributor
    ];

    initialize(): void {
        logger.info(`Initializing ${this.name} tracker...`);
        this.contributors.forEach(c => c.initialize());
    }

    dispose(): void {
        logger.info(`Disposing ${this.name} tracker...`);
        this.contributors.forEach(c => c.dispose());
    }

    getActivity(): Activity | null {
        const allProperties: Record<string, string> = {};
        let isActive = false;

        for (const contributor of this.contributors) {
            try {
                const properties = contributor.getProperties();
                if (properties) {
                    isActive = true;
                    Object.assign(allProperties, properties);
                }
            } catch (error) {
                logger.error(`Contributor ${contributor.name} failed`, error);
            }
        }

        if (!isActive) {
            return null; // No coding activity detected from any contributor.
        }

        // If any contributor was active, we create a single "Coding" activity event.
        return {
            name: this.name,
            duration_ms: PULSE_DURATION_MS,
            properties: allProperties,
        };
    }
}

export const codingTracker = new CodingActivityTracker(); 