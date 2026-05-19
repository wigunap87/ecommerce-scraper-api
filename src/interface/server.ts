import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "../config/environment";
import { Logger } from "../infrastructure/services/Logger";
import { InMemoryCacheService } from "../infrastructure/services/CacheService";
import { ProxyService } from "../infrastructure/services/ProxyService";
import { ScraperService } from "../infrastructure/services/ScraperService";
import { GetProductUseCase } from "../application/useCases/GetProductUseCase";
import { ProductController } from "./controllers/ProductController";
import { createProductRoutes } from "./routes/productRoutes";
import { createErrorHandler } from "./middleware/errorHandler";

export function createServer(): Application {
  const app = express();
  const logger = new Logger();
  const cacheService = new InMemoryCacheService();
  const proxyService = env.PROXY_LIST.length > 0 ? new ProxyService(env.PROXY_LIST) : undefined;
  const scraperService = new ScraperService(logger, proxyService);
  const getProductUseCase = new GetProductUseCase(scraperService, cacheService, logger);
  const productController = new ProductController(getProductUseCase, logger);
  const productRoutes = createProductRoutes(productController);

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/", productRoutes);

  app.use(createErrorHandler(logger));

  return app;
}
