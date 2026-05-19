import { IScraperService } from "../../domain/interfaces/IScraperService";
import { ICacheService } from "../../domain/interfaces/ICacheService";
import { ILogger } from "../../domain/interfaces/ILogger";
import { ProductData } from "../../domain/entities/Product";
import { ProductRequestDto } from "../dto/ProductRequestDto";

export class GetProductUseCase {
  constructor(
    private readonly scraperService: IScraperService,
    private readonly cacheService: ICacheService,
    private readonly logger: ILogger
  ) {}

  async execute(request: ProductRequestDto): Promise<ProductData> {
    const cacheKey = `product:${request.storeId}:${request.dealId}`;

    const cached = this.cacheService.get<ProductData>(cacheKey);
    if (cached) {
      this.logger.info("Cache hit for product", { storeId: request.storeId, dealId: request.dealId });
      return cached;
    }

    this.logger.info("Fetching product from scraper", { storeId: request.storeId, dealId: request.dealId });

    const productData = await this.scraperService.fetchProduct(request.storeId, request.dealId);
    this.cacheService.set(cacheKey, productData);
    return productData;
  }
}
