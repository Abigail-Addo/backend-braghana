import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

// import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Controller('ads')
export class AdsController {
  constructor(
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  private validateAuthorization(request: any) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return requestHeaders;
  }

  @Post()
  async createAd(
    @Request() request: any,
    @Body()
    createAdDto: {
      title: string;
      content: string;
      imageUrl?: string;
      linkUrl: string;
      startDate: string;
      endDate: string;
      targetedAudience: string[];
    },
  ) {
    const headers = this.validateAuthorization(request);
    if ('error' in headers) return headers;

    return this.natsClient.send(
      { cmd: 'create_ad' },
      { headers, data: createAdDto },
    );
  }

  @Get()
  async getAds() {
    return this.natsClient.send({ cmd: 'get_all_ads' }, {});
  }

  @Get(':adId')
  async getAd(@Request() request: any, @Param('adId') adId: string) {
    const headers = this.validateAuthorization(request);
    if ('error' in headers) return headers;

    return this.natsClient.send(
      { cmd: 'get_ad' },
      { headers, params: { adId } },
    );
  }

  @Put(':adId')
  async updateAd(
    @Request() request: any,
    @Param('adId') adId: string,
    @Body()
    updateAdDto: {
      title?: string;
      content?: string;
      imageUrl?: string;
      linkUrl?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
      targetedAudience?: string[];
    },
  ) {
    const headers = this.validateAuthorization(request);
    if ('error' in headers) return headers;

    return this.natsClient.send(
      { cmd: 'update_ad' },
      { headers, params: { adId }, data: updateAdDto },
    );
  }

  @Delete(':adId')
  async deleteAd(@Request() request: any, @Param('adId') adId: string) {
    const headers = this.validateAuthorization(request);
    if ('error' in headers) return headers;

    return this.natsClient.send(
      { cmd: 'delete_ad' },
      { headers, params: { adId } },
    );
  }
}
