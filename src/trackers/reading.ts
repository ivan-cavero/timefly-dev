import { ActivityTracker } from './base';
import { Activity, ActivityName } from '../types/pulse';
import { logger } from '../utils/logger';

class ReadingTracker implements ActivityTracker {
    public name: ActivityName = 'Reading';

    getActivity(): Activity | null {
        // Placeholder logic
        // In the future, this will check for active text editor without typing.
        return null; 
    }

    initialize(): void {
        logger.info(`Initializing ${this.name} tracker...`);
    }

    dispose(): void {
        logger.info(`Disposing ${this.name} tracker...`);
    }
}

export const readingTracker = new ReadingTracker(); 