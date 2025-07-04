export enum StatusBarState {
	INITIALIZING = 'INITIALIZING',
	AUTHENTICATED = 'AUTHENTICATED',
	UNAUTHENTICATED = 'UNAUTHENTICATED',
	ERROR = 'ERROR'
}

export interface StatusBarInfo {
	text: string
	tooltip: string
	command?: string
	color?: string
	backgroundColor?: string
}
