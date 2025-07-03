import * as vscode from 'vscode';
import { ActivityContributor } from './base';

class TypingContributor implements ActivityContributor {
    public name = 'Typing';

    getProperties(): Record<string, string> | null {
        // In the future, this would listen to vscode.workspace.onDidChangeTextDocument
        // and perform more complex analysis to track actual typing events.
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return {
                language: editor.document.languageId,
                // Add more properties like chars_typed, lines_added etc. here
            };
        }
        return null;
    }

    initialize(): void {
        // Register listeners for typing here
    }
    
    dispose(): void {
        // Dispose of listeners here
    }
}
export const typingContributor = new TypingContributor(); 