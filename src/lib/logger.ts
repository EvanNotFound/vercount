type LogLevel = "info" | "error" | "warn" | "debug";

function formatMessage(level: LogLevel, ...messages: unknown[]): string {
  const timestamp = new Date().toISOString();
  // Convert all messages to a string and join them
  const formattedMessages = messages
    .map((m) => (typeof m === "string" ? m : JSON.stringify(m, null, 2)))
    .join(" ");
  return `${timestamp} ${level}: ${formattedMessages}`;
}

const logger = {
  info(...messages: unknown[]): void {
    console.log(formatMessage("info", ...messages));
  },
  error(...messages: unknown[]): void {
    console.error(formatMessage("error", ...messages));
  },
  warn(...messages: unknown[]): void {
    console.warn(formatMessage("warn", ...messages));
  },
  debug(...messages: unknown[]): void {
    console.debug(formatMessage("debug", ...messages));
  },
  // Add other logging levels if needed
};

export default logger;
