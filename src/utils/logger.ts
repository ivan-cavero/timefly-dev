export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    DANGER = 4
}

export interface LoggerConfig {
    level: LogLevel;
    enableColors: boolean;
    prefix?: string;
}

export class Logger {
    private config: LoggerConfig;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = {
            level: LogLevel.INFO,
            enableColors: true,
            prefix: 'TimeFly',
            ...config
        };
    }

    private formatTimestamp(): string {
        return new Date().toISOString();
    }

    private colorize(text: string, color: string): string {
        if (!this.config.enableColors) {
            return text;
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
        };

        return `${colors[color] || ''}${text}${colors.reset}`;
    }

    private log(level: LogLevel, levelName: string, message: string, ...args: any[]): void {
        if (level < this.config.level) {
            return;
        }

        const timestamp = this.formatTimestamp();
        const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
        
        let coloredLevel: string;
        switch (level) {
            case LogLevel.DEBUG:
                coloredLevel = this.colorize(`[${levelName}]`, 'gray');
                break;
            case LogLevel.INFO:
                coloredLevel = this.colorize(`[${levelName}]`, 'blue');
                break;
            case LogLevel.WARN:
                coloredLevel = this.colorize(`[${levelName}]`, 'yellow');
                break;
            case LogLevel.ERROR:
                coloredLevel = this.colorize(`[${levelName}]`, 'red');
                break;
            case LogLevel.DANGER:
                coloredLevel = this.colorize(`[${levelName}]`, 'magenta');
                break;
            default:
                coloredLevel = `[${levelName}]`;
        }

        const formattedMessage = `[${timestamp}] ${coloredLevel} ${prefix} ${message}`;
        
        // Use appropriate console method based on level
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formattedMessage, ...args);
                break;
            case LogLevel.INFO:
                console.info(formattedMessage, ...args);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, ...args);
                break;
            case LogLevel.ERROR:
            case LogLevel.DANGER:
                console.error(formattedMessage, ...args);
                break;
            default:
                console.log(formattedMessage, ...args);
        }
    }

    debug(message: string, ...args: any[]): void {
        this.log(LogLevel.DEBUG, 'DEBUG', message, ...args);
    }

    info(message: string, ...args: any[]): void {
        this.log(LogLevel.INFO, 'INFO', message, ...args);
    }

    warn(message: string, ...args: any[]): void {
        this.log(LogLevel.WARN, 'WARN', message, ...args);
    }

    error(message: string, ...args: any[]): void {
        this.log(LogLevel.ERROR, 'ERROR', message, ...args);
    }

    danger(message: string, ...args: any[]): void {
        this.log(LogLevel.DANGER, 'DANGER', message, ...args);
    }

    // Helper methods for operation logging (inspired by your API format)
    operationStart(operation: string, details?: string): void {
        const message = details ? `<-- ${operation} ${details}` : `<-- ${operation}`;
        this.info(message);
    }

    operationEnd(operation: string, duration: number, status?: string, details?: string): void {
        const statusStr = status ? ` ${status}` : '';
        const detailsStr = details ? ` ${details}` : '';
        const message = `--> ${operation}${statusStr} ${duration}ms${detailsStr}`;
        this.info(message);
    }

    // Method to time operations
    timeOperation<T>(operation: string, fn: () => T | Promise<T>, details?: string): Promise<T> {
        return new Promise(async (resolve, reject) => {
            const start = Date.now();
            this.operationStart(operation, details);
            
            try {
                const result = await fn();
                const duration = Date.now() - start;
                this.operationEnd(operation, duration, 'SUCCESS', details);
                resolve(result);
            } catch (error) {
                const duration = Date.now() - start;
                this.operationEnd(operation, duration, 'ERROR', details);
                this.error(`Operation failed: ${operation}`, error);
                reject(error);
            }
        });
    }

    // Method to set log level
    setLogLevel(level: LogLevel): void {
        this.config.level = level;
    }

    // Method to enable/disable colors
    setColorsEnabled(enabled: boolean): void {
        this.config.enableColors = enabled;
    }
}

// Create a default logger instance
export const logger = new Logger();

// Export convenience functions using the default logger
export const debug = (message: string, ...args: any[]) => logger.debug(message, ...args);
export const info = (message: string, ...args: any[]) => logger.info(message, ...args);
export const warn = (message: string, ...args: any[]) => logger.warn(message, ...args);
export const error = (message: string, ...args: any[]) => logger.error(message, ...args);
export const danger = (message: string, ...args: any[]) => logger.danger(message, ...args); 