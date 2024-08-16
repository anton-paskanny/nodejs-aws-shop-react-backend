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
      console.log('[BFF Service] No recipientUrl, cannot process request.');
      throw new HttpException('Cannot process request', HttpStatus.BAD_GATEWAY);
    }

    const targetPath = req.url.replace(`/${serviceName}`, '');

    console.log('[BFF Service] targetPath: ', targetPath);

    const isGetProductsListReq =
      serviceName.toLowerCase() === ServiceListEnum.PRODUCTS_SERVICE &&
      req.method === 'GET' &&
      targetPath === '/products';

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
      const finalUrl = `${recipientUrl}${targetPath}`;

      const hasBody = Object.keys(req.body || {}).length > 0;
      const authHeader = req.headers?.authorization;

      console.log(
        '[BFF Service] Proxy request to the recipient url: ',
        finalUrl,
      );

      const reqConfigFinal = {
        method: req.method,
        url: finalUrl,
        params: req.query,
        ...(authHeader ? { headers: { Authorization: authHeader } } : {}),
        ...(hasBody && { data: req.body }),
      };

      console.log('[BFF Service] Proxy request config: ', reqConfigFinal);

      const response = await axios(reqConfigFinal);

      console.log(
        '[BFF Service] Proxy request response status: ',
        response?.status,
      );
      console.log(
        '[BFF Service] Proxy request response data: ',
        response?.data,
      );

      // Cache the response for getProductsList
      if (isGetProductsListReq) {
        console.log('[BFF Service] Caching products list');
        await this.cacheManager.set(
          'products',
          { status: response.status, data: response.data },
          TTL_IN_MLS,
        );
      }

      return { status: response.status, data: response.data };
    } catch (error) {
      if (error.response) {
        console.log(
          '[BFF Service] Error response status: ',
          error.response.status,
        );
        console.log('[BFF Service] Error response data: ', error.response.data);
        throw new HttpException(error.response.data, error.response.status);
      } else {
        console.log('[BFF Service] Error: ', error);
        throw new HttpException(
          '[BFF Service] Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
