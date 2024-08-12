import {
  Controller,
  Req,
  Res,
  HttpStatus,
  All,
  BadGatewayException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppService } from './app.service';
import { BFF_ROUTES_ARR } from './utils';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @All('/:serviceName/*')
  async proxyRequest(@Req() req: Request, @Res() res: Response) {
    const { serviceName } = req.params;

    console.log('[BFF Controller] serviceName: ', serviceName);

    if (!serviceName || !BFF_ROUTES_ARR.includes(serviceName)) {
      console.log('[BFF Controller] Cannot process request: ', serviceName);
      throw new BadGatewayException('[BFF Controller] Cannot process request');
    }

    try {
      console.log('[BFF Controller] Making proxy request');
      const result = await this.appService.proxyRequest(req, serviceName);
      return res.status(result.status).send(result.data);
    } catch (error) {
      return res
        .status(
          error.getStatus
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR,
        )
        .send(error.message);
    }
  }
}
