export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	DANGER = 4
}

export interface LoggerConfig {
	level: LogLevel
	enableColors: boolean
	prefix?: string
}
