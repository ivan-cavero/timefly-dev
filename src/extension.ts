import * as vscode from "vscode";
import { handleConfigureApiKey, handleLogout } from "@/commands/auth";
import { showWelcomeMessage } from "@/components/welcomeMessage";
import { analytics } from "@/services/analytics";
import { initStorageService, type StorageService } from "@/services/storage";
import { info, logger } from "@/utils/logger";
import { trackActivation, trackPrivacyChange } from "@/utils/telemetry";
import { statusBar } from "@/components/statusBar";
import { StatusBarState } from "@/types/statusBar";
import { handleOpenWebsite } from "@/commands/general";
import { trackingService } from "@/services/trackingService";

function registerCommands(context: vscode.ExtensionContext) {
	// Register TimeFly commands
	const commands = [
		vscode.commands.registerCommand(
			"timefly.configureApiKey",
			handleConfigureApiKey,
		),
		vscode.commands.registerCommand("timefly.logout", handleLogout),
		vscode.commands.registerCommand("timefly.openWebsite", handleOpenWebsite),
	];

	// Add all commands to subscriptions for proper cleanup
	context.subscriptions.push(...commands);
	info("TimeFly commands registered");
}

export async function activate(context: vscode.ExtensionContext) {
	info("TimeFly Dev extension activated");

	// ALWAYS register commands first, regardless of initialization errors
	registerCommands(context);

	// Initialize status bar
	statusBar.init(context);
	statusBar.update(StatusBarState.INITIALIZING);

	try {
		// Initialize storage service with context
		const { storageService } = await initializeStorageService(context);

		// Always initialize analytics service, but tracking will depend on user setting
		await analytics.init();

		// Track extension activation with environment info
		await trackActivation();

		// Check authentication status and show appropriate message
		const isAuthenticated = await handleStartupAuthentication(storageService);

		// Listen for configuration changes
		setupConfigurationListeners(context);

		// Initialize the tracking service with the current auth state.
		// The service will only start its intervals if isAuthenticated is true.
		await trackingService.updateAuthenticationStatus(isAuthenticated);

	} catch (error) {
		logger.error("Error during extension activation", error);
		statusBar.update(StatusBarState.ERROR);

		// Still show welcome message even if analytics fails
		try {
			await showWelcomeMessage();
		} catch (welcomeError) {
			logger.error("Failed to show welcome message", welcomeError);
		}

		// Track the initialization error if analytics is available
		if (analytics.isEnabled() && error instanceof Error) {
			await analytics.trackError(error, { context: "extension_activation" });
		}
	}
}

function setupConfigurationListeners(context: vscode.ExtensionContext) {
	// Listen for changes to analytics setting
	const configListener = vscode.workspace.onDidChangeConfiguration(
		async (e) => {
			if (e.affectsConfiguration("timefly.analytics.enabled")) {
				const config = vscode.workspace.getConfiguration("timefly");
				const enabled = config.get<boolean>("analytics.enabled", true);

				info(`Analytics setting changed to: ${enabled}`);
				await trackPrivacyChange(enabled);
			}
		},
	);

	context.subscriptions.push(configListener);
}

/**
 * Initialize storage service and make it available globally
 */
async function initializeStorageService(
	context: vscode.ExtensionContext,
): Promise<{ storageService: StorageService }> {
	const storage = initStorageService(context);

	// Validate stored data integrity
	const isValid = await storage.validateStoredData();
	if (!isValid) {
		logger.warn("Detected inconsistent storage state - consider clearing data");
	}

	info("Storage service initialized");
	return { storageService: storage };
}

/**
 * Handle startup authentication check
 */
async function handleStartupAuthentication(
	storage: StorageService,
): Promise<boolean> {
	try {
		const authSummary = await storage.getAuthenticationSummary();

		if (
			authSummary.isAuthenticated &&
			authSummary.hasApiKey &&
			authSummary.userInfo
		) {
			// User is already authenticated
			const userName =
				authSummary.userInfo.name || authSummary.userInfo.email || "Developer";
			info(
				`Welcome back ${userName}! TimeFly is ready to track your coding time.`,
			);
			statusBar.update(StatusBarState.AUTHENTICATED);
			return true;

			// Optional: Show a subtle welcome back message
			// vscode.window.showInformationMessage(`👋 Welcome back ${userName}!`);
		} else {
			// User needs to authenticate
			info("User not authenticated - showing welcome message");
			statusBar.update(StatusBarState.UNAUTHENTICATED);
			await showWelcomeMessage();
			return false;
		}
	} catch (error) {
		logger.error("Error checking authentication status", error);
		statusBar.update(StatusBarState.ERROR);
		// Fallback to welcome message
		await showWelcomeMessage();
		return false;
	}
}

export async function deactivate() {
	info("TimeFly Dev extension deactivated");

	// Stop the unified tracking and syncing service
	// trackingService.stop(); // This is no longer needed, service state is managed by auth

	try {
		await analytics.shutdown();
	} catch (error) {
		logger.error("Error during extension deactivation", error);
	}
}
