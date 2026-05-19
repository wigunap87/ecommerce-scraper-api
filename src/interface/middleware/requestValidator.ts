import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../../domain/errors/ValidationError";

export function validateProductRequest(req: Request, _res: Response, next: NextFunction): void {
  const { storeId, dealId } = req.query;

  if (!storeId || typeof storeId !== "string") {
    throw new ValidationError("Missing or invalid 'storeId' parameter");
  }

  if (!dealId || typeof dealId !== "string") {
    throw new ValidationError("Missing or invalid 'dealId' parameter");
  }

  if (!/^\d+$/.test(storeId)) {
    throw new ValidationError("'storeId' must be a numeric string");
  }

  if (!/^\d+$/.test(dealId)) {
    throw new ValidationError("'dealId' must be a numeric string");
  }

  next();
}
