import * as vscode from "vscode";
import { StatusBarState, type StatusBarInfo } from "@/types/statusBar";
import { logger } from "@/utils/logger";

const STATUS_BAR_STATES: Record<StatusBarState, StatusBarInfo> = {
	[StatusBarState.INITIALIZING]: {
		text: "$(sync~spin) Initializing TimeFly",
		tooltip: "TimeFly is starting up...",
	},
	[StatusBarState.UNAUTHENTICATED]: {
		text: "$(warning) Configure API Key",
		tooltip: "Click to configure your TimeFly API Key",
		command: "timefly.configureApiKey",
	},
	[StatusBarState.AUTHENTICATED]: {
		text: "$(watch) 0s",
		tooltip: "TimeFly is tracking your coding activity.",
		command: "timefly.logout",
	},
	[StatusBarState.ERROR]: {
		text: "$(error) TimeFly Error",
		tooltip: "An error occurred. Check logs for details.",
		color: "statusBarItem.errorForeground",
	},
};

class StatusBarService {
	private statusBarItem: vscode.StatusBarItem;

	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			100,
		);
	}

	public init(context: vscode.ExtensionContext) {
		context.subscriptions.push(this.statusBarItem);
		this.statusBarItem.show();
		logger.info("Status bar initialized");
	}

	public update(state: StatusBarState, dynamicText?: string) {
		const stateInfo = STATUS_BAR_STATES[state];
		this.statusBarItem.text = dynamicText ?? stateInfo.text;
		this.statusBarItem.tooltip = stateInfo.tooltip;
		this.statusBarItem.command = stateInfo.command;
		this.statusBarItem.color = stateInfo.color
			? new vscode.ThemeColor(stateInfo.color)
			: undefined;
	}

	public dispose() {
		this.statusBarItem.dispose();
	}
}

export const statusBar = new StatusBarService(); 