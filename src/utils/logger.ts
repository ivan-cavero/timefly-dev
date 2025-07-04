import { type LoggerConfig, LogLevel } from '@/types/logger'

const createLogger = (config: Partial<LoggerConfig> = {}) => {
	const currentConfig: LoggerConfig = {
		level: LogLevel.INFO,
		enableColors: true,
		prefix: 'TimeFly',
		...config
	}

	const formatTimestamp = (): string => {
		return new Date().toISOString()
	}

	const colorize = (text: string, color: string): string => {
		if (!currentConfig.enableColors) {
			return text
		}

		const colors: { [key: string]: string } = {
			reset: '\x1b[0m',
			red: '\x1b[31m',
			yellow: '\x1b[33m',
			blue: '\x1b[34m',
			green: '\x1b[32m',
			magenta: '\x1b[35m',
			cyan: '\x1b[36m',
			white: '\x1b[37m',
			gray: '\x1b[90m'
		}

		return `${colors[color] || ''}${text}${colors.reset}`
	}

	const log = (level: LogLevel, levelName: string, message: string, ...args: unknown[]): void => {
		if (level < currentConfig.level) {
			return
		}

		const timestamp = formatTimestamp()
		const prefix = currentConfig.prefix ? `[${currentConfig.prefix}]` : ''

		let coloredLevel: string
		switch (level) {
			case LogLevel.DEBUG:
				coloredLevel = colorize(`[${levelName}]`, 'gray')
				break
			case LogLevel.INFO:
				coloredLevel = colorize(`[${levelName}]`, 'blue')
				break
			case LogLevel.WARN:
				coloredLevel = colorize(`[${levelName}]`, 'yellow')
				break
			case LogLevel.ERROR:
				coloredLevel = colorize(`[${levelName}]`, 'red')
				break
			case LogLevel.DANGER:
				coloredLevel = colorize(`[${levelName}]`, 'magenta')
				break
			default:
				coloredLevel = `[${levelName}]`
		}

		const formattedMessage = `[${timestamp}] ${coloredLevel} ${prefix} ${message}`

		// Use appropriate console method based on level
		switch (level) {
			case LogLevel.DEBUG:
				console.debug(formattedMessage, ...args)
				break
			case LogLevel.INFO:
				console.info(formattedMessage, ...args)
				break
			case LogLevel.WARN:
				console.warn(formattedMessage, ...args)
				break
			case LogLevel.ERROR:
			case LogLevel.DANGER:
				console.error(formattedMessage, ...args)
				break
			default:
				console.log(formattedMessage, ...args)
		}
	}

	const debug = (message: string, ...args: unknown[]): void => {
		log(LogLevel.DEBUG, 'DEBUG', message, ...args)
	}

	const info = (message: string, ...args: unknown[]): void => {
		log(LogLevel.INFO, 'INFO', message, ...args)
	}

	const warn = (message: string, ...args: unknown[]): void => {
		log(LogLevel.WARN, 'WARN', message, ...args)
	}

	const error = (message: string, ...args: unknown[]): void => {
		log(LogLevel.ERROR, 'ERROR', message, ...args)
	}

	const danger = (message: string, ...args: unknown[]): void => {
		log(LogLevel.DANGER, 'DANGER', message, ...args)
	}

	// Helper methods for operation logging
	const operationStart = (operation: string, details?: string): void => {
		const message = details ? `<-- ${operation} ${details}` : `<-- ${operation}`
		info(message)
	}

	const operationEnd = (operation: string, duration: number, status?: string, details?: string): void => {
		const statusStr = status ? ` ${status}` : ''
		const detailsStr = details ? ` ${details}` : ''
		const message = `--> ${operation}${statusStr} ${duration}ms${detailsStr}`
		info(message)
	}

	// Method to time operations
	const timeOperation = async <T>(operation: string, fn: () => T | Promise<T>, details?: string): Promise<T> => {
		const start = Date.now()
		operationStart(operation, details)

		try {
			const result = await fn()
			const duration = Date.now() - start
			operationEnd(operation, duration, 'SUCCESS', details)
			return result
		} catch (err) {
			const duration = Date.now() - start
			operationEnd(operation, duration, 'ERROR', details)
			error(`Operation '${operation}' failed.`, err)
			throw err
		}
	}

	// Method to set log level
	const setLogLevel = (level: LogLevel): void => {
		currentConfig.level = level
	}

	// Method to enable/disable colors
	const setColorsEnabled = (enabled: boolean): void => {
		currentConfig.enableColors = enabled
	}

	return {
		debug,
		info,
		warn,
		error,
		danger,
		operationStart,
		operationEnd,
		timeOperation,
		setLogLevel,
		setColorsEnabled
	}
}

// Create a default logger instance
export const logger = createLogger()

// Export convenience functions using the default logger
export const debug = (message: string, ...args: unknown[]) => logger.debug(message, ...args)
export const info = (message: string, ...args: unknown[]) => logger.info(message, ...args)
export const warn = (message: string, ...args: unknown[]) => logger.warn(message, ...args)
export const error = (message: string, ...args: unknown[]) => logger.error(message, ...args)
export const danger = (message: string, ...args: unknown[]) => logger.danger(message, ...args)
