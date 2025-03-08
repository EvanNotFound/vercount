const isProd = process.env.NODE_ENV === "production";
const isDebug = process.env.DEBUG === "true"; // Enable debug logs via environment variable

// ANSI color codes
const Colors = {
  Reset: "\x1b[0m",
  FgCyan: "\x1b[36m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgRed: "\x1b[31m",
};

// Function to color the log level
const colorizeLogLevel = (level: string, color: string) =>
  `${color}${level}${Colors.Reset}`;

const logger = {
  debug: (message: string, data?: any) => {
    if (isDebug) {
      const logLevel = colorizeLogLevel("DEBUG", Colors.FgCyan);
      const formattedMessage = `[${new Date().toISOString()}] ${logLevel}: ${message}`;
      console.debug(formattedMessage, data || "");
    }
  },

  info: (message: string, data?: any) => {
    const logLevel = colorizeLogLevel("INFO", Colors.FgGreen);
    const formattedMessage = `[${new Date().toISOString()}] ${logLevel}: ${message}`;
    if (isProd) {
      console.log(message, data ? data : "");
    } else {
      console.log(formattedMessage, data || "");
    }
  },

  warn: (message: string, data?: any) => {
    const logLevel = colorizeLogLevel("WARN", Colors.FgYellow);
    const formattedMessage = `[${new Date().toISOString()}] ${logLevel}: ${message}`;
    if (isProd) {
      console.warn(message, data ? data : "");
    } else {
      console.warn(formattedMessage, data || "");
    }
  },

  error: (message: string, err?: any) => {
    const logLevel = colorizeLogLevel("ERROR", Colors.FgRed);
    const formattedMessage = `[${new Date().toISOString()}] ${logLevel}: ${message}`;
    if (isProd) {
      console.error(message, err ? err : "");
    } else {
      console.error(formattedMessage, err || "");
    }
  },
};

export default logger;
