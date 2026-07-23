export interface LogPayload {
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string | number;
  };
  timestamp?: string;
}

export const log = ({ level, message, context = "System", metadata = {}, error }: LogPayload) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...(Object.keys(metadata).length > 0 && { metadata }),
    ...(error && {
      error: {
        name: error.name || "Error",
        message: error.message || String(error),
        code: (error as any).code || "UNKNOWN_ERROR",
        stack: error.stack,
      },
    }),
  };

  const output = JSON.stringify(logEntry);
  if (level === "ERROR") {
    console.error(output);
  } else if (level === "WARN") {
    console.warn(output);
  } else {
    console.log(output);
  }
  return logEntry;
};

export const logger = {
  info: (message: string, context?: string, metadata?: Record<string, any>) =>
    log({ level: "INFO", message, context, metadata }),
  warn: (message: string, context?: string, metadata?: Record<string, any>) =>
    log({ level: "WARN", message, context, metadata }),
  error: (message: string, error?: any, context?: string, metadata?: Record<string, any>) =>
    log({ level: "ERROR", message, context, metadata, error }),
};
