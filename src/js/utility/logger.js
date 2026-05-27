import StackTraceParser from "error-stack-parser";
import {
  getBrowserContext,
  getDeviceContext,
  getNetworkInfo,
  getPWAInfo,
  getPageContext,
  getPerformanceContext,
  getServiceWorkerInfo,
  isBrowser,
} from "./logger_info.js";

const LOG_LEVELS = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
});

const DEFAULT_CONFIG = Object.freeze({
  level: LOG_LEVELS.WARN,
  prefix: "%c[GRADUATION]",
  enablePerformance: true,
  enableAnalytics: false,
  maxStringLength: 2000,
  timestamp: true,
  colors: true,
});

class Logger {
  constructor(config = {}) {
    this.config = Object.freeze({ ...DEFAULT_CONFIG, ...config });
    this.isBrowser = typeof window !== "undefined";
    this.isNode = typeof process !== "undefined" && process.env;
    this.isWorker = typeof self !== "undefined" && self.location;
    this.performanceMarks = new Map();
    this.workingFolder = "/home/kenne-junior/Desktop/Graduation";
    this.useBrowserURL = true;
    this.contextStack = [];
    this._detectEnvironment();
    this._setupGlobalErrorHandling();
    this.platform = typeof navigator !== "undefined" ? navigator.platform : "unknown";
  }

  _detectEnvironment() {
    if (this.isBrowser) {
      this._setupBrowserEnvironment();
      return;
    }
    if (this.isNode) {
      this._setupNodeEnvironment();
      return;
    }
    this.shouldLog = false;
  }

  _setupBrowserEnvironment() {
    const { hostname, origin, search } = window.location;
    const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]" ||
        origin.includes("local.");

    const urlParams = new URLSearchParams(search);
    const paramValues = {
      debug: urlParams.get("debug"),
      log: urlParams.get("log"),
      logLevel: urlParams.get("logLevel"),
      graduation: urlParams.get("graduation"),
      logger: urlParams.get("logger"),
    };
    const getWorkingFolder = {
      debug: urlParams.get("debugfolder"),
      log: urlParams.get("logfolder"),
      logLevel: urlParams.get("logfolder"),
      graduation: urlParams.get("graduationfolder"),
      logger: urlParams.get("loggerfolder"),
    };
    if (
        getWorkingFolder.debug ||
        getWorkingFolder.log ||
        getWorkingFolder.logLevel ||
        getWorkingFolder.graduation ||
        getWorkingFolder.logger
    ) {
      this.workingFolder =
          getWorkingFolder.debug ||
          getWorkingFolder.log ||
          getWorkingFolder.logLevel ||
          getWorkingFolder.graduation ||
          getWorkingFolder.logger;
      this.info("Using the param folder " + this.workingFolder);
    }

    const allSources = [
      ...Object.values(paramValues).filter(Boolean),
      window.localStorage?.getItem("GRADUATION_DEBUG"),
      window.sessionStorage?.getItem("GRADUATION_DEBUG"),
      window._GRADUATION_DEBUG,
      window._GRADUATION_LOG_LEVEL,
    ].filter(Boolean);

    this.shouldLog = isLocal;
    let levelSet = false;

    for (const source of allSources) {
      const value = String(source).toLowerCase().trim();
      if (
          value === "true" ||
          value === "1" ||
          value === "enable" ||
          value === "on" ||
          value === "yes"
      ) {
        this.shouldLog = true;
        continue;
      }
      if (
          value === "false" ||
          value === "0" ||
          value === "disable" ||
          value === "off" ||
          value === "no"
      ) {
        this.shouldLog = false;
        continue;
      }
      if (["debug", "info", "warn", "error", "silent"].includes(value)) {
        this.shouldLog = true;
        this.config = { ...this.config, level: this._parseLogLevel(value) };
        levelSet = true;
        break;
      }
    }
    this._logConfiguration(levelSet);
  }

  _logConfiguration(levelWasSet = false) {
    if (this.shouldLog) {
      const levelName = this._getLevelLabel(this.config.level);
      const source = levelWasSet ? "URL/Config" : "Default";
      console.log(
          `%c[GRADUATION] Logger Active`,
          "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 14px;"
      );
      console.log(
          `%c📊 Level: ${levelName} | 🔧 Source: ${source}`,
          "color: #6b7280; font-weight: bold; margin-left: 10px;"
      );
    }
  }

  _setupNodeEnvironment() {
    this.shouldLog = !!process.env.DEBUG || !!process.env.GRADUATION_DEBUG;
    const level = process.env.LOG_LEVEL || process.env.GRADUATION_LOG_LEVEL;
    if (level) {
      this.config = { ...this.config, level: this._parseLogLevel(level) };
    }
  }

  _setupWorkerEnvironment() {
    try {
      const origin = self.location?.origin || "";
      const hostname = self.location?.hostname || "";
      const isLocal =
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          origin.includes("local.");
      this.shouldLog = isLocal;
    } catch (error) {
      this.shouldLog = false;
    }
  }

  _parseLogLevel(level) {
    const levelMap = {
      debug: LOG_LEVELS.DEBUG,
      info: LOG_LEVELS.INFO,
      warn: LOG_LEVELS.WARN,
      error: LOG_LEVELS.ERROR,
      silent: LOG_LEVELS.SILENT,
    };
    return levelMap[String(level).toLowerCase()] ?? LOG_LEVELS.DEBUG;
  }

  _setupGlobalErrorHandling() {
    if (!this.shouldLog || this.config.level > LOG_LEVELS.ERROR) return;
    if (this.isBrowser) {
      window.addEventListener("error", (event) => {
        this.error("Uncaught error", event.error, {
          message: event.error?.message,
          filename: ` ${event.filename}:${event.lineno}:${event.colno}`,
          lineno: event.lineno,
          colno: event.colno,
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        this.error("Unhandled promise rejection", {
          reason: event.reason?.message || event.reason,
        });
      });
    }
    if (this.isNode) {
      process.on("uncaughtException", (error) => {
        this.error("Uncaught exception", error);
      });
      process.on("unhandledRejection", (reason, promise) => {
        this.error("Unhandled promise rejection", reason);
      });
    }
  }

  _log(level, args, context = {}) {
    if (!this.shouldLog || level < this.config.level) {
      return;
    }
    const callerInfo = this._getCallerInfo();
    const enhancedContext = { ...context, caller: callerInfo };
    try {
      const timestamp = this.config.timestamp ? this._getTimestamp() : "";
      const emoji = this._getLevelEmoji(level);
      const levelLabel = this._getLevelLabel(level);
      const mergedContext = this._mergeContext(enhancedContext);
      const formattedArgs = this._formatArguments(args);
      const style = this.config.colors ? this._getLevelStyle(level) : "";
      const messageStyle = this.config.colors
          ? this._getMessageStyle(level, { highlight: true })
          : "";

      const logArgs = this._buildLogArguments(
          timestamp,
          `${emoji} ${levelLabel}`,
          style,
          messageStyle,
          formattedArgs,
          mergedContext
      );
      this._writeToConsole(level, logArgs);

      if (this.config.enableAnalytics && level >= LOG_LEVELS.WARN) {
        this._sendToAnalytics(level, formattedArgs, mergedContext);
      }
    } catch (error) {
      this._fallbackLog(...args);
    }
  }

  _getCallerInfo() {
    try {
      const stackFrame = StackTraceParser.parse(new Error());
      const callerFrame = stackFrame[3] || stackFrame[2] || stackFrame[1];
      if (!callerFrame) {
        return { file: "unknown", line: "unknown", column: "unknown" };
      }
      const {
        functionName,
        source,
        fileName: file,
        lineNumber: lineNum,
        columnNumber: column,
      } = callerFrame;
      const cleanFile = this._cleanFilePath(file);
      const fullPath = this._getFullFilePath(file);
      return {
        function: functionName || "anonymous",
        file: cleanFile,
        fullPath: fullPath,
        source: source || "unknown",
        line: parseInt(lineNum),
        column: parseInt(column),
        clickableUrl: this._createClickableUrl(
            fullPath,
            parseInt(lineNum),
            parseInt(column)
        ),
      };
    } catch (error) {
      return {
        file: "error",
        line: "error",
        column: "error",
        error: error.message,
      };
    }
  }

  _cleanFilePath(filePath) {
    if (!filePath) return "unknown";
    if (filePath.startsWith("file://")) {
      filePath = filePath.replace("file://", "");
    }
    filePath = filePath.replace(/(\?t=\d+)?$/, "");
    filePath = filePath.replace(/^https?:\/\/[^/]+/, "");
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  }

  _getFullFilePath(filePath) {
    if (!filePath) return "unknown";
    if (filePath.startsWith("file://")) {
      filePath = filePath.replace("file://", "");
    }
    return filePath.replace(/(\?t=\d+)?$/, "");
  }

  _createClickableUrl(filePath, line, column) {
    let full_path;
    if (this.isBrowser) {
      const cleanurl = filePath
          .replace(/(\?t=\d+)?$/, "")
          .replace(/^https?:\/\/[^/]+/, "");
      full_path = this.workingFolder + cleanurl;
      const vscodeUrl = `vscode://file${full_path}:${line}:${column}`;
      const browserUrl = `${filePath}:${line}:${column}`;
      return { vscodeUrl, browserUrl };
    } else {
      return `file://${filePath}:${line}:${column}`;
    }
  }

  // ========== FIX #1: Objects stay raw (expandable in DevTools) ==========
  _formatArguments(args) {
    return args.map((arg) => {
      if (typeof arg === "string") {
        return arg.length > this.config.maxStringLength
            ? arg.substring(0, this.config.maxStringLength) + "..."
            : arg;
      }
      if (arg instanceof Error) {
        const errorObj = {
          name: arg.name,
          message: arg.message,
          ...(this.config.level === LOG_LEVELS.DEBUG && { stack: arg.stack }),
        };
        if (arg.cause) {
          errorObj.cause = this._formatArguments([arg.cause])[0];
        }
        return errorObj;
      }
      // All other objects: pass through raw
      return arg;
    });
  }

  // ========== FIX #2: Correct argument structure ==========
  _buildLogArguments(
      timestamp,
      levelLabel,
      style,
      messageStyle,
      formattedArgs,
      context
  ) {
    const args = [];
    const hasContext = Object.keys(context).length > 0;

    // 1. CSS styles (always first two items)
    if (this.config.colors) {
      args.push(style); // → used by first %c (prefix)
      args.push(messageStyle); // → used by second %c (main message)
    }

    // 2. Build clickable URL (NO %c inside – it's part of the main message)
    let clickableUrl = "";
    if (hasContext && context.caller && context.caller.clickableUrl) {
      const url = context.caller.clickableUrl;
      clickableUrl = `🔗 ${
          this.useBrowserURL ? url.browserUrl : url.vscodeUrl
      }`;
    }

    const mainMessage = `${
        timestamp ? ` ${timestamp}` : ""
    } ${levelLabel}${
        clickableUrl ? ` ${clickableUrl}` : ""
    }\n ->`;

    // 4. The main message string (will get %c prepended in _writeToConsole)
    args.push(mainMessage);

    // 5. Spread all user log arguments
    args.push(...formattedArgs);

    // 6. Context object as last argument
    if (hasContext) {
      args.push({ context });
    }

    return args;
  }

  // ========== FIX #3: _writeToConsole consumes correctly ==========
  _writeToConsole(level, args = []) {
    let levelStyle, messagestyle;
    if (this.config.colors) {
      levelStyle = args.shift(); // CSS for prefix
      messagestyle = args.shift(); // CSS for main message
    }

    // The next item is the main message (without %c)
    const mainMessage = args.shift();

    // Everything left is the user's log arguments + context
    const remainingArgs = args;

    // Build the final format string with exactly TWO %c placeholders
    const formatString = `%c${mainMessage}`;
    //                                          ^ first %c  ^ second %c (from prefix inside mainMessage)

    const logArgs = [
     ` ${this.config.prefix}  ${formatString}`,
      levelStyle,
      messagestyle,
      ...(Array.isArray(remainingArgs) ? remainingArgs : [remainingArgs])
    ].filter((arg) => arg !== undefined);

    switch (level) {
      case LOG_LEVELS.DEBUG:
        console.debug(...logArgs);
        break;
      case LOG_LEVELS.INFO:
        console.info(...logArgs);
        break;
      case LOG_LEVELS.WARN:
        console.warn(...logArgs);
        break;
      case LOG_LEVELS.ERROR:
        console.error(...logArgs);
        break;
      default:
        console.log(...logArgs);
        break;
    }
  }

  _getTimestamp() {
    return new Date().toISOString().replace("T", " ").replace(/\..+/, "");
  }

  _getLevelLabel(level) {
    const labels = {
      [LOG_LEVELS.DEBUG]: "DEBUG",
      [LOG_LEVELS.INFO]: "INFO",
      [LOG_LEVELS.WARN]: "WARN",
      [LOG_LEVELS.ERROR]: "ERROR",
      [LOG_LEVELS.SILENT]: "SILENT",
    };
    return labels[level] || "UNKNOWN";
  }

  _getLevelEmoji(level) {
    const emojis = {
      [LOG_LEVELS.DEBUG]: "🐛",
      [LOG_LEVELS.INFO]: "ℹ️",
      [LOG_LEVELS.WARN]: "⚠️",
      [LOG_LEVELS.ERROR]: "💀",
    };
    return emojis[level] || "📝";
  }

  _createLevelStyleGenerator = () => {
    const STYLE_CONFIGS = {
      [LOG_LEVELS.DEBUG]: {
        bg: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        color: "#93c5fd",
        border: "1px solid #3b82f6",
        glow: "0 0 8px rgba(59, 130, 246, 0.3)",
      },
      [LOG_LEVELS.INFO]: {
        bg: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
        color: "#f9fafb",
        border: "1px solid #60a5fa",
        glow: "0 0 8px rgba(59, 130, 246, 0.4)",
      },
      [LOG_LEVELS.WARN]: {
        bg: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
        color: "#1f2937",
        border: "1px solid #b45309",
        glow: "0 0 8px rgba(245, 158, 11, 0.4)",
      },
      [LOG_LEVELS.ERROR]: {
        bg: "linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)",
        color: "#fef2f2",
        border: "1px solid #7f1d1d",
        glow: "0 0 8px rgba(239, 68, 68, 0.4)",
      },
    };
    const styleCache = new Map();
    const baseStyle = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
      font-weight: 600;
      font-size: 0.75rem;
      padding: 6px 10px;
      border-radius: 8px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
      transition: all 0.2s ease-in-out;
    `
        .replace(/\s+/g, " ")
        .trim();

    return (level) => {
      if (styleCache.has(level)) return styleCache.get(level);
      const config = STYLE_CONFIGS[level] || STYLE_CONFIGS[LOG_LEVELS.DEBUG];
      const style =
          `${baseStyle} border: ${config.border}; background: ${config.bg}; color: ${config.color}; box-shadow: ${config.glow}, 0 2px 4px rgba(0, 0, 0, 0.1);`
              .replace(/\s+/g, " ")
              .trim();
      styleCache.set(level, style);
      return style;
    };
  };

  getLevelStyle = this._createLevelStyleGenerator();
  _getLevelStyle(level) {
    return this.getLevelStyle(level);
  }

  _createMessageStyleGenerator = () => {
    const cache = new Map();

    const colorStyle = {
      [LOG_LEVELS.DEBUG]: {
        color: "#cb93fdff",
        glow: "0 0 8px rgba(59, 130, 246, 0.3)",
      },
      [LOG_LEVELS.INFO]: {
        color: "#1258fbff",
        glow: "0 0 8px rgba(59, 130, 246, 0.4)",
      },
      [LOG_LEVELS.WARN]: {
        color: "#e0ce0aff",
        glow: "0 0 8px rgba(245, 158, 11, 0.4)",
      },
      [LOG_LEVELS.ERROR]: {
        color: "#f70e0aff",
        glow: "0 0 8px rgba(239, 68, 68, 0.4)",
      },
    };
    const base = [
      "font-family: 'SF Mono', Monaco, Consolas, 'Roboto Mono', monospace",
      "font-size: 12px",
      "font-weight: 400",
      "padding: 2px 6px",
      "border-radius: 4px",
      "line-height: 1",
      "margin: 0",
    ].join("; ");

    return (level, opts = {}) => {
      const key = level;
      if (cache.has(key)) return cache.get(key);
      const config = colorStyle[level] || colorStyle[LOG_LEVELS.DEBUG];
      const color = opts.muted
          ? "#9CA3AF"
          : opts.highlight
              ? config.color
              : "#E6E7E8";
      const bg = opts.muted
          ? "transparent"
          : opts.highlight
              ? "rgba(14,165,233,0.06)"
              : "transparent";
      const weight = opts.highlight ? 600 : 400;
      const style = [
        base,
        `border: ${config.border}`,
        `color: ${color}`,
        `box-shadow: ${config.glow}, 0 2px 4px rgba(0, 0, 0, 0.1)`,
        bg !== "transparent" ? `background: ${bg}` : "",
        `font-weight: ${weight}`,
        `border-radius: 4px`,
      ]
          .filter(Boolean)
          .join("; ");
      cache.set(key, style);
      return style;
    };
  };

  getMessageStyle = this._createMessageStyleGenerator();
  _getMessageStyle(level, option = {}) {
    return this.getMessageStyle(level, option);
  }

  _mergeContext(context) {
    return this.contextStack.reduce(
        (acc, ctx) => ({ ...acc, ...ctx }),
        context
    );
  }

  _fallbackLog(...args) {
    try {
      console.log("[GRADUATION] Fallback:", ...args);
    } catch (e) {}
  }

  _sendToAnalytics(level, args, context) {
    if (!this.config.enableAnalytics) return this;
    const event = {
      level: this._getLevelLabel(level),
      message: args
          .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
          .join(" "),
      context,
      timestamp: new Date().toISOString(),
      userAgent: this.isBrowser ? navigator.userAgent : "node",
      url: this.isBrowser ? window.location.href : "server",
    };
    if (this.isBrowser && window.gtag) {
      window.gtag("event", "exception", {
        description: event.message,
        fatal: level === LOG_LEVELS.ERROR,
      });
    }
    this._sendToBackend(event);
    return this;
  }

  _sendToBackend(event) {
    if (typeof fetch === "undefined") return;
    if (this.isBrowser && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(event)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/logs", blob);
    } else {
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(() => {});
    }
  }

  debug(...args) {
    this._log(LOG_LEVELS.DEBUG, args);
    return this;
  }
  info(...args) {
    this._log(LOG_LEVELS.INFO, args);
    return this;
  }
  warn(...args) {
    this._log(LOG_LEVELS.WARN, args);
    return this;
  }
  error(...args) {
    this._log(LOG_LEVELS.ERROR, args);
    return this;
  }

  time(label) {
    if (!this.config.enablePerformance || !this.shouldLog) return this;
    const mark = `log_${label}_${Date.now()}`;
    const markData = { mark, startTime: Date.now() };
    sessionStorage.setItem(`perfMark_${label}`, JSON.stringify(markData));
    this.performanceMarks.set(label, markData);
    if (this.isBrowser && performance?.mark) performance.mark(mark);
    this.debug(`⏱️  Started: ${label}`);
    return this;
  }

  timeEnd(label) {
    if (!this.config.enablePerformance || !this.shouldLog) return this;
    let markData = this.performanceMarks.get(label);
    if (!markData) {
      try {
        const raw = sessionStorage.getItem(`perfMark_${label}`);
        if (raw) markData = JSON.parse(raw);
      } catch (e) {
        markData = undefined;
      }
    }
    if (!markData || !markData.startTime) return this;
    const duration = Date.now() - markData.startTime;
    if (this.isBrowser && performance?.measure) {
      performance.measure(`duration_${label}`, markData.mark);
      const entries = performance.getEntriesByName(`duration_${label}`);
      if (entries.length > 0)
        this.debug(
            `⏱️  Completed: ${label}`,
            `${entries[0].duration.toFixed(2)}ms`
        );
    } else {
      this.debug(`⏱️  Completed: ${label}`, `${duration}ms`);
    }
    sessionStorage.removeItem(`perfMark_${label}`);
    this.performanceMarks.delete(label);
    return this;
  }

  pushContext(context) {
    this.contextStack.push(context);
    return this;
  }
  popContext() {
    this.contextStack.pop();
    return this;
  }

  withContext(context) {
    const loggerWithContext = {
      _logger: this,
      _context: context,
      debug: (...args) => {
        this._log(LOG_LEVELS.DEBUG, args, context);
        return loggerWithContext;
      },
      info: (...args) => {
        this._log(LOG_LEVELS.INFO, args, context);
        return loggerWithContext;
      },
      warn: (...args) => {
        this._log(LOG_LEVELS.WARN, args, context);
        return loggerWithContext;
      },
      error: (...args) => {
        this._log(LOG_LEVELS.ERROR, args, context);
        return loggerWithContext;
      },
      time: (label) => {
        this.time(label);
        return loggerWithContext;
      },
      timeEnd: (label) => {
        this.timeEnd(label);
        return loggerWithContext;
      },
      group: (label) => {
        this.group(label);
        return loggerWithContext;
      },
      groupEnd: () => {
        this.groupEnd();
        return loggerWithContext;
      },
      withContext: (additionalContext) =>
          this.withContext({ ...context, ...additionalContext }),
      enable: () => {
        this.enable();
        return this;
      },
      disable: () => {
        this.disable();
        return this;
      },
      setLevel: (level) => {
        this.setLevel(level);
        return this;
      },
      pushContext: (ctx) => {
        this.pushContext(ctx);
        return loggerWithContext;
      },
      popContext: () => {
        this.popContext();
        return loggerWithContext;
      },
    };
    return loggerWithContext;
  }

  group(label) {
    if (this.shouldLog)
      console.group(
          `%c${this.config.prefix} ${label}`,
          "color: #7c3aed; font-weight: bold;"
      );
    return this;
  }

  groupEnd() {
    if (this.shouldLog) console.groupEnd();
    return this;
  }

  enable() {
    this.shouldLog = true;
    return this;
  }
  disable() {
    this.shouldLog = false;
    return this;
  }
  setLevel(level) {
    this.config = { ...this.config, level: this._parseLogLevel(level) };
    return this;
  }
}

const logger = new Logger();

export function _log(...args) {
  logger.info(...args);
}
export { LOG_LEVELS, Logger };
export const createLogger = (config) => new Logger(config);

export default logger.withContext({
  application: "GraduationCelebration",
  version: "1.0.0",
  environment: isBrowser
      ? process.env.NODE_ENV || "development"
      : "production",
  timestamp: new Date().toISOString(),
  runtime: isBrowser ? "browser" : "node",
  page: getPageContext(),
  browser: getBrowserContext(),
  device: getDeviceContext(),
  pwa: getPWAInfo(),
  network: getNetworkInfo(),
  performance: getPerformanceContext(),
  serviceWorker: getServiceWorkerInfo(),
});