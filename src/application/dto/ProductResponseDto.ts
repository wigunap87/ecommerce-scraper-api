import { ProductData } from "../../domain/entities/Product";

export interface ProductResponseDto {
  success: boolean;
  data: ProductData | null;
  error?: string;
  cached?: boolean;
}
