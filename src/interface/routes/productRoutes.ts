import { Router } from "express";
import { ProductController } from "../controllers/ProductController";
import { validateProductRequest } from "../middleware/requestValidator";
import { rateLimiter } from "../middleware/rateLimiter";

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  router.get("/health", (req, res) => controller.healthCheck(req, res));
  router.get("/shopee", rateLimiter, validateProductRequest, (req, res) => controller.getProduct(req, res));

  return router;
}
