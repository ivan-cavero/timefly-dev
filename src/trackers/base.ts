import { Activity } from "../types/pulse";

export interface ActivityTracker {
    // A unique name for the tracker
    name: string;

    // A function to get the current activity data from this tracker.
    // If the user is not performing this activity, it should return null.
    getActivity(): Activity | null;

    // Initialize the tracker (e.g., register event listeners)
    initialize(): void;

    // Dispose the tracker (e.g., unregister event listeners)
    dispose(): void;
} 