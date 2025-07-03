import { PulseMetadata } from '@/types/pulse';

export interface MetadataProvider {
    // A unique name for the provider
    name: string;

    // A function to get the current context data from this provider.
    getContext(): Promise<PulseMetadata>;

    // Initialize the provider (e.g., register event listeners)
    initialize(): void;

    // Dispose the provider (e.g., unregister event listeners)
    dispose(): void;
} 