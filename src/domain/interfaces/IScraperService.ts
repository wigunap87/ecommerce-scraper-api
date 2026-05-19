import { ProductData } from "../entities/Product";

export interface IScraperService {
  fetchProduct(storeId: string, dealId: string): Promise<ProductData>;
}
