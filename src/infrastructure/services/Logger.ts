import pino from "pino";
import { ILogger } from "../../domain/interfaces/ILogger";
import { env } from "../../config/environment";

class ChildLogger implements ILogger {
  constructor(private readonly logger: pino.Logger) {}

  info(msg: string, meta?: Record<string, unknown>): void {
    this.logger.info(meta || {}, msg);
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    this.logger.warn(meta || {}, msg);
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    this.logger.error(meta || {}, msg);
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.logger.debug(meta || {}, msg);
  }

  child(meta: Record<string, unknown>): ILogger {
    return new ChildLogger(this.logger.child(meta));
  }
}

export class Logger extends ChildLogger implements ILogger {
  constructor(requestId?: string) {
    const baseConfig: pino.LoggerOptions = {
      level: env.LOG_LEVEL,
      base: {
        env: env.NODE_ENV,
        requestId: requestId || undefined,
      },
    };

    if (env.NODE_ENV === "development") {
      baseConfig.transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss.l o",
          ignore: "pid,hostname",
          messageFormat: "[{requestId}] {msg}",
        },
      };
    }

    const rootLogger = pino(baseConfig);
    super(rootLogger);
  }
}
