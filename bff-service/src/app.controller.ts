import {
  Controller,
  Req,
  Res,
  HttpException,
  HttpStatus,
  All,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @All('/:serviceName/*')
  async proxyRequest(@Req() req: Request, @Res() res: Response) {
    const { serviceName } = req.params;
    const recipientUrl = this.configService.get<string>(
      `${serviceName.toUpperCase()}_SERVICE_URL`,
    );

    if (!recipientUrl) {
      throw new HttpException(
        '[BFF Controller] Cannot process request',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const targetPath = req.url.replace(`/${serviceName}`, '');

    try {
      const response = await axios({
        method: req.method,
        url: `${recipientUrl}${targetPath}`,
        headers: req.headers,
        data: req.body,
        params: req.query,
      });

      res.status(response.status).send(response.data);
    } catch (error) {
      if (error.response) {
        res.status(error.response.status).send(error.response.data);
      } else {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send('[BFF Conrtoller] Internal server error');
      }
    }
  }
}
