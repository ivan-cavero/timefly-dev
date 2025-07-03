import * as vscode from "vscode";
import { info } from "@/utils/logger";
import { trackWebsiteOpened } from "@/utils/telemetry";

/**
 * Command: Open TimeFly Website
 */
export async function handleOpenWebsite(
	source: "status_bar" | "welcome_message" = "status_bar",
): Promise<void> {
	info(`User clicked to open TimeFly website from: ${source}`);
	await trackWebsiteOpened(source);
	await vscode.env.openExternal(vscode.Uri.parse("https://timefly.dev/"));
} 