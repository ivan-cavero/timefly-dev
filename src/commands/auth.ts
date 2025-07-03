import * as vscode from "vscode";
import { configureApiKey } from "@/auth/setup";
import { clearAuthenticationData } from "@/auth/state";
import { getStorageService } from "@/services/storage";
import { info, logger } from "@/utils/logger";
import { trackLogout } from "@/utils/telemetry";
import { statusBar } from "@/components/statusBar";
import { StatusBarState } from "@/types/statusBar";
import { trackingService } from "@/services/trackingService";

/**
 * Command: Configure API Key
 */
export async function handleConfigureApiKey(): Promise<void> {
	const success = await configureApiKey();
	await trackingService.updateAuthenticationStatus(success);
}

/**
 * Command: Logout from TimeFly
 */
export async function handleLogout(): Promise<void> {
	try {
		const storage = getStorageService();
		const userInfo = storage.getUserInfo();

		if (!userInfo) {
			vscode.window.showInformationMessage(
				"📭 You are not currently logged in to TimeFly",
			);
			return;
		}

		const confirmMessage = 
			`🚪 Logout from TimeFly\n\n` +
			`This will remove your API key and stop tracking your coding activity.\n\n` +
			`Currently logged in as: ${userInfo.name} (${userInfo.email})`;

		const selection = await vscode.window.showWarningMessage(
			confirmMessage,
			{ modal: true },
			"Yes, Logout"
		);

		if (selection === "Yes, Logout") {
			await trackingService.updateAuthenticationStatus(false);
			
			await clearAuthenticationData();
			statusBar.update(StatusBarState.UNAUTHENTICATED);

			info("User logged out successfully");
			await trackLogout("completed");

			vscode.window.showInformationMessage(
				"👋 Successfully logged out from TimeFly. Your local data has been cleared.",
			);
		} else {
			logger.debug("Logout cancelled by user");
			await trackLogout("cancelled");
		}
	} catch (error) {
		logger.error("Error during logout", error);
		await trackLogout(
			"error",
			error instanceof Error ? error.message : "unknown_error",
		);
		vscode.window.showErrorMessage("Failed to logout. Please try again.");
	}
}
