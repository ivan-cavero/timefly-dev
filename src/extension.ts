import * as vscode from "vscode";
import { handleConfigureApiKey, handleLogout } from "@/commands/auth";
import { showWelcomeMessage } from "@/components/welcomeMessage";
import { analytics } from "@/services/analytics";
import { initStorageService, type StorageService } from "@/services/storage";
import { info, logger } from "@/utils/logger";
import { trackActivation, trackPrivacyChange } from "@/utils/telemetry";

function registerCommands(context: vscode.ExtensionContext) {
	// Register TimeFly commands
	const commands = [
		vscode.commands.registerCommand(
			"timefly.configureApiKey",
			handleConfigureApiKey,
		),
		vscode.commands.registerCommand("timefly.logout", handleLogout),
	];

	// Add all commands to subscriptions for proper cleanup
	context.subscriptions.push(...commands);
	info("TimeFly commands registered");
}

export async function activate(context: vscode.ExtensionContext) {
	info("TimeFly Dev extension activated");

	try {
		// Initialize storage service with context
		const { storageService } = await initializeStorageService(context);

		// Always initialize analytics service, but tracking will depend on user setting
		await analytics.init();

		// Track extension activation with environment info
		await trackActivation();

		// Check authentication status and show appropriate message
		await handleStartupAuthentication(storageService);

		// Register VS Code commands
		registerCommands(context);

		// Listen for configuration changes
		setupConfigurationListeners(context);
	} catch (error) {
		logger.error("Error during extension activation", error);

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
): Promise<void> {
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

			// Optional: Show a subtle welcome back message
			// vscode.window.showInformationMessage(`👋 Welcome back ${userName}!`);
		} else {
			// User needs to authenticate
			info("User not authenticated - showing welcome message");
			await showWelcomeMessage();
		}
	} catch (error) {
		logger.error("Error checking authentication status", error);
		// Fallback to welcome message
		await showWelcomeMessage();
	}
}

export async function deactivate() {
	info("TimeFly Dev extension deactivated");

	try {
		await analytics.shutdown();
	} catch (error) {
		logger.error("Error during extension deactivation", error);
	}
}
