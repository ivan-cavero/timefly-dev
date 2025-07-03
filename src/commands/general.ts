import * as vscode from "vscode";
import { info } from "@/utils/logger";

/**
 * Command: Open TimeFly Website
 */
export async function handleOpenWebsite(): Promise<void> {
	info("User clicked to open TimeFly website");
	await vscode.env.openExternal(vscode.Uri.parse("https://timefly.dev/"));
} 