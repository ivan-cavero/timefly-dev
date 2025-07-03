import { MetadataProvider } from './metadataProvider';
import { PulseMetadata } from '@/types/pulse';

class GitMetadataProvider implements MetadataProvider {
    public name = 'GitMetadataProvider';

    async getContext(): Promise<PulseMetadata> {
        // TODO: Use a library like 'simple-git' or run a git command
        // to check if vscode.workspace.rootPath is inside a git repo.
        return {
            has_git_repo: 'false',
        };
    }

    initialize(): void {
        console.log(`[${this.name}] Initialized.`);
    }

    dispose(): void {
        console.log(`[${this.name}] Disposed.`);
    }
}

export const gitMetadataProvider = new GitMetadataProvider(); 