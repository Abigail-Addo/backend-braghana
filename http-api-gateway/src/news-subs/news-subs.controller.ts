import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Controller('newsletters')
export class NewsSubsController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @Post()
  async createNewsletter(@Body() newsLetterDto: any, @Request() request: any) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    console.log('newsLetterDto', newsLetterDto);

    return this.natsClient.send(
      { cmd: 'create_newsletter' },
      { headers: requestHeaders, body: newsLetterDto },
    );
  }

  @Get()
  async getAllNewsletters(@Request() request: any) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'get_all_newsletters' },
      { headers: requestHeaders },
    );
  }

  @Put(':newsletterId')
  async updateNewsletter(
    @Param('newsletterId') newsletterId: string,
    @Body() updateNewsletterDto: any,
    @Request() request: any,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'update_newsletter' },
      {
        headers: requestHeaders,
        body: { ...updateNewsletterDto, newsletterId },
      },
    );
  }

  @Delete(':newsletterId')
  async deleteNewsletter(
    @Param('newsletterId') newsletterId: string,
    @Request() request: any,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'delete_newsletter' },
      { headers: requestHeaders, body: { newsletterId } },
    );
  }

  // subscribe to newsletter
  @Post(':newsletterId/subscribe')
  async subscribeToNewsletter(
    @Param('newsletterId') newsletterId: string,
    @Request() request: any,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'subscribe_to_newsletter' },
      { headers: requestHeaders, body: { newsletterId } },
    );
  }

  @Post(':newsletterId/unsubscribe')
  async unsubscribeFromNewsletter(
    @Param('newsletterId') newsletterId: string,
    @Request() request: any,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'unsubscribe_from_newsletter' },
      { headers: requestHeaders, body: { newsletterId } },
    );
  }

  @Get(':newsletterId/subscribers')
  async getNewsletterSubscribers(
    @Param('newsletterId') newsletterId: string,
    @Request() request: any,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'get_newsletter_subscribers' },
      { headers: requestHeaders, body: { newsletterId } },
    );
  }

  @Get('users/:userId')
  async getUserSubscriptions(
    @Param('userId') userId: string,
    @Request() request: any,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'get_user_subscriptions' },
      { headers: requestHeaders, body: { userId } },
    );
  }

  @Get(':newsletterId/subscription')
  async checkSubscriptionStatus(
    @Param('newsletterId') newsletterId: string,
    @Request() request: any,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'check_subscription_status' },
      { headers: requestHeaders, body: { newsletterId } },
    );
  }
}
