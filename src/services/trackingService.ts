import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { activityTrackers, metadataProviders } from '../trackers';
import { Activity, Pulse, PulseMetadata } from '../types/pulse';
import { getExtensionVersion } from '../utils/vscode';
import machineId from '../utils/machineId';
import { getStorageService } from './storage';
import { getAuthenticationState } from '../auth/state';
import { logger } from '../utils/logger';

const PULSE_INTERVAL_MS = 10 * 1000; // 10 seconds
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

class TrackingService {
    private pulseInterval: NodeJS.Timeout | null = null;
    private syncInterval: NodeJS.Timeout | null = null;
    private baseMetadata: PulseMetadata = {};
    private storage = getStorageService();
    private isRunning = false;

    public async updateAuthenticationStatus(isAuthenticated: boolean): Promise<void> {
        if (isAuthenticated) {
            await this.start();
        } else {
            await this.stop();
        }
    }

    private async start(): Promise<void> {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        logger.info('TrackingService: Starting...');
        
        await this.prepareBaseMetadata();
        this.initializeTrackers();

        this.pulseInterval = setInterval(() => this.handlePulse(), PULSE_INTERVAL_MS);
        this.syncInterval = setInterval(() => this.handleSync(), SYNC_INTERVAL_MS);

        this.handleSync();
        
        logger.info('TrackingService: Started successfully.');
    }

    private async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        logger.info('TrackingService: Stopping...');
        if (this.pulseInterval) {
            clearInterval(this.pulseInterval);
            this.pulseInterval = null;
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.disposeTrackers();
        
        // Perform one final sync on stop
        await this.handleSync();

        logger.info('TrackingService: Stopped.');
    }

    private initializeTrackers(): void {
        activityTrackers.forEach(t => t.initialize());
        metadataProviders.forEach(p => p.initialize());
    }

    private disposeTrackers(): void {
        activityTrackers.forEach(t => t.dispose());
        metadataProviders.forEach(p => p.dispose());
    }

    private async prepareBaseMetadata(): Promise<void> {
        this.baseMetadata = {
            ide_name: 'vscode',
            os_platform: process.platform,
            extension_version: getExtensionVersion(),
            machine_id: await machineId(),
            ide_instance_id: vscode.env.sessionId,
        };
    }

    private async handlePulse(): Promise<void> {
        const activities = this.getCurrentActivities();
        if (activities.length === 0) {
            return; // No activity, do nothing
        }

        const pulse = await this.buildPulse(activities);
        if (pulse) {
            await this.storage.addPulse(pulse);
            logger.debug('TrackingService: Pulse created and stored.', pulse);
        }
    }
    
    private getCurrentActivities(): Activity[] {
        const activities: Activity[] = [];
        for (const tracker of activityTrackers) {
            const activity = tracker.getActivity();
            if (activity) {
                activities.push(activity);
            }
        }
        return activities;
    }

    private async buildPulse(activities: Activity[]): Promise<Pulse | null> {
        const authState = await getAuthenticationState();
        if (!authState.isAuthenticated || !authState.userInfo) {
            return null;
        }

        const contextualMetadata: PulseMetadata = {};
        for (const provider of metadataProviders) {
            const context = await provider.getContext();
            Object.assign(contextualMetadata, context);
        }
        
        const finalMetadata = { ...this.baseMetadata, ...contextualMetadata };
        const projectId = vscode.workspace.name ?? 'unknown_project';

        return {
            event_id: randomUUID(),
            user_id: authState.userInfo.uuid,
            project_id: projectId,
            event_time: new Date().toISOString(),
            metadata: finalMetadata,
            activities,
        };
    }

    private async handleSync(): Promise<void> {
        const pulses = await this.storage.getPulses();
        if (pulses.length === 0) {
            // This is a normal state, so no need to log every 30 minutes.
            // logger.debug('[TrackingService] No pulses to sync.');
            return;
        }

        logger.info(`TrackingService: Found ${pulses.length} pulses to sync.`);
        // TODO: Send pulses to the backend API
        
        // For now, we just clear them. In the future, this should only happen on success.
        await this.storage.clearPulses();
        logger.info('TrackingService: Cleared pulse queue.');
    }
}

// Export a singleton instance of the service
export const trackingService = new TrackingService(); 