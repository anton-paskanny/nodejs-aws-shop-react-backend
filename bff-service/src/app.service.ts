import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Request } from 'express';
import { ServiceListEnum, TTL_IN_MLS } from './utils';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async proxyRequest(
    req: Request,
    serviceName: string,
  ): Promise<{ status: number; data: any }> {
    const recipientUrl = this.configService.get<string>(
      `${serviceName.toUpperCase()}_SERVICE_URL`,
    );

    console.log('[BFF Service] recipientUrl: ', recipientUrl);

    if (!recipientUrl) {
      throw new HttpException('Cannot process request', HttpStatus.BAD_GATEWAY);
    }

    const targetPath = req.url.replace(`/${serviceName}`, '');

    const isGetProductsListReq =
      serviceName.toLowerCase() === ServiceListEnum.PRODUCTS_SERVICE &&
      req.method === 'GET' &&
      targetPath === '/product/products';

    if (isGetProductsListReq) {
      console.log('[BFF Service] Get products url');

      const cachedProducts: { status: HttpStatus; data: any } | undefined =
        await this.cacheManager.get('products');

      if (cachedProducts) {
        console.log(
          '[BFF Service] Returning products from cache',
          cachedProducts,
        );
        return cachedProducts;
      }
    }

    try {
      const response = await axios({
        method: req.method,
        url: `${recipientUrl}${targetPath}`,
        headers: req.headers,
        data: req.body,
        params: req.query,
      });

      // Cache the response for getProductsList
      if (isGetProductsListReq) {
        await this.cacheManager.set(
          'products',
          { status: response.status, data: response.data },
          TTL_IN_MLS,
        );
        console.log('[BFF Service] Caching products list');
      }

      return { status: response.status, data: response.data };
    } catch (error) {
      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      } else {
        throw new HttpException(
          '[BFF Service] Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
