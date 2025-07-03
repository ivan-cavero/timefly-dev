import * as vscode from 'vscode';

export function getExtensionVersion(): string {
    // The publisher.name from package.json. Assuming 'TimeFly' as publisher.
    const extension = vscode.extensions.getExtension('TimeFly.timefly-dev');
    return extension?.packageJSON.version ?? 'unknown';
} 