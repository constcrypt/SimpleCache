export enum LogLevel {	Info = "INFO",
	Warn = "WARN",
	Error = "ERROR",
}

class CacheLogger {
	private static enabled = true;

	public static setEnabled(state: boolean) {
		this.enabled = state;
	}

	private static log(level: LogLevel, message: string) {
		if (!this.enabled) return;
		print(`[SimpleCache:${level}] ${message}`);
	}

	public static info(message: string) {
		this.log(LogLevel.Info, message);
	}

	public static warn(message: string) {
		this.log(LogLevel.Warn, message);
	}

	public static error(message: string) {
		this.log(LogLevel.Error, message);
	}
}

export default CacheLogger;