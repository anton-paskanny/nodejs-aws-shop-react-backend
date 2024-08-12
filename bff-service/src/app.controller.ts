import { Controller, Req, Res, HttpStatus, All } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @All('/:serviceName/*')
  async proxyRequest(@Req() req: Request, @Res() res: Response) {
    const { serviceName } = req.params;

    try {
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
