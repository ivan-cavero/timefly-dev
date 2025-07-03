import { ActivityTracker } from './base';
import { codingTracker } from './coding';
import { readingTracker } from './reading';
import { debuggingTracker } from './debugging';
import { MetadataProvider } from './metadataProvider';
import { gitMetadataProvider } from './git';

/**
 * A list of all available activity trackers.
 * To add a new tracker, simply import it and add it to this array.
 */
export const activityTrackers: ActivityTracker[] = [
    codingTracker,
    readingTracker,
    debuggingTracker,
];

/**
 * A list of all available metadata providers.
 * To add a new provider, simply import it and add it to this array.
 */
export const metadataProviders: MetadataProvider[] = [
    gitMetadataProvider,
]; 