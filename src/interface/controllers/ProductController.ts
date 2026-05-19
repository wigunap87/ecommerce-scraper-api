import { Request, Response } from "express";
import { GetProductUseCase } from "../../application/useCases/GetProductUseCase";
import { ILogger } from "../../domain/interfaces/ILogger";
import { ScraperError } from "../../domain/errors/ScraperError";

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export class ProductController {
  constructor(
    private readonly getProductUseCase: GetProductUseCase,
    private readonly logger: ILogger
  ) {}

  async getProduct(req: Request, res: Response): Promise<void> {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const { storeId, dealId } = req.query as { storeId: string; dealId: string };
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    // Create a child logger with request context
    const reqLogger = this.logger.child({
      requestId,
      storeId,
      dealId,
      clientIp,
      method: req.method,
      path: req.path,
      query: req.query,
    });

    reqLogger.info("[REQUEST] Product request received");

    try {
      const productData = await this.getProductUseCase.execute({ storeId, dealId });
      const duration = Date.now() - startTime;

      reqLogger.info("[RESPONSE] Product request completed", {
        durationMs: duration,
        success: true,
        hasData: productData.data !== null,
        shopeeError: productData.error,
        statusCode: 200,
      });

      // Return exact Shopee get_pc format: { bff_meta, data, error, error_msg }
      res.status(200).json(productData);
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;
      const statusCode = error instanceof ScraperError ? error.statusCode : 500;

      reqLogger.error("[RESPONSE] Product request failed", {
        durationMs: duration,
        error: err.message,
        errorType: err.constructor.name,
        isRetryable: error instanceof ScraperError ? error.isRetryable : false,
        statusCode,
      });

      // Return error in Shopee-like format
      res.status(statusCode).json({
        bff_meta: null,
        data: null,
        error: -1,
        error_msg: err.message,
      });
    }
  }

  async healthCheck(_req: Request, res: Response): Promise<void> {
    this.logger.info("[REQUEST] Health check requested", { method: _req.method, path: _req.path });
    res.status(200).json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  }
}
