import { Request, Response, NextFunction } from "express";
import { ScraperError } from "../../domain/errors/ScraperError";
import { ValidationError } from "../../domain/errors/ValidationError";
import { ILogger } from "../../domain/interfaces/ILogger";
import { env } from "../../config/environment";

export function createErrorHandler(logger: ILogger) {
  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    logger.error("Unhandled error", {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
      });
      return;
    }

    if (err instanceof ScraperError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: env.NODE_ENV === "development" ? err.message : "Internal server error",
    });
  };
}
