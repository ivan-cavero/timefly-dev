import { ActivityTracker } from './base';
import { Activity, ActivityName } from '../types/pulse';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';

class DebuggingTracker implements ActivityTracker {
    public name: ActivityName = 'Debugging';

    getActivity(): Activity | null {
        // A more concrete example for debugging activity
        if (vscode.debug.activeDebugSession) {
            const activity: Activity = {
                name: this.name,
                duration_ms: 10000, // Placeholder: assume it was for the whole 10s pulse
                properties: {
                    debugger_type: vscode.debug.activeDebugSession.type,
                },
            };
            return activity;
        }
        return null;
    }

    initialize(): void {
        logger.info(`Initializing ${this.name} tracker...`);
        // In the future, we can use these events for more granular tracking.
        // vscode.debug.onDidStartDebugSession
        // vscode.debug.onDidTerminateDebugSession
    }

    dispose(): void {
        logger.info(`Disposing ${this.name} tracker...`);
    }
}

export const debuggingTracker = new DebuggingTracker(); 