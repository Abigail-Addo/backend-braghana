import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateBetDto } from './dtos/lottery.dto';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';

@Controller('lottery')
export class LotteryController {
  constructor(
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @Post()
  async placeBet(@Req() request: Request, @Body() data: CreateBetDto) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'create_bet' },
      { data, headers: requestHeaders },
    );
  }
  @Get('all/bets')
  async getAllBets() {
    return this.natsClient.send({ cmd: 'get_all_bets' }, {});
  }

  @Get('user/:userId')
  async getUserBets(@Req() request: Request, @Param('userId') userId: string) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'get_user_bets' },
      { headers: requestHeaders, userId },
    );
  }

  @Get('winning/bets/:userId')
  async getWonBets(@Req() request: Request, @Param('userId') userId: string) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error,
      };
    }
    return this.natsClient.send(
      { cmd: 'get_won_bets' },
      { headers: requestHeaders, userId },
    );
  }

  @Get('pending/:userId')
  async getPendingBets(
    @Req() request: Request,
    @Param('userId') userId: string,
  ) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }
    return this.natsClient.send(
      { cmd: 'get_pending_bets' },
      { headers: requestHeaders, userId },
    );
  }

  @Get('lost/:userId')
  async getLostBets(@Req() request: Request, @Param('userId') userId: string) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }
    return this.natsClient.send(
      { cmd: 'get_lost_bets' },
      { headers: requestHeaders, userId },
    );
  }

  @Delete('bet/:betId')
  async deleteBet(@Req() request: Request, @Param('betId') betId: string) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'delete_bet' },
      { headers: requestHeaders, betId },
    );
  }

  @Get('statistics')
  async getStatistics() {
    return this.natsClient.send({ cmd: 'get_statistics' }, {});
  }

  @Get('draws')
  async getDraws() {
    return this.natsClient.send({ cmd: 'get_all_draws' }, {});
  }

  // ================ payment ==========================

  // initiate payment
  @Post('/pay')
  async initiatePayment(@Req() request: Request, @Body() data: any) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    try {
      const responseObservable = this.natsClient.send(
        { cmd: 'initiate_payment' },
        { data, headers: requestHeaders },
      );

      const response = await firstValueFrom(responseObservable);
      return response;
    } catch (error) {
      console.error('Error initiating payment:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Failed to initiate payment. Please try again later.',
        details: error.message,
      };
    }
  }

  //  verify payment
  @Post('/verify')
  async verifyPayment(@Req() request: Request, @Body() data: any) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    const response = this.natsClient.send(
      { cmd: 'verify_payment' },
      { data, headers: requestHeaders },
    );

    return response;
  }

  @Get('/payment/transactions')
  async getTransactions(@Req() request: Request) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }
    return this.natsClient.send(
      { cmd: 'get_payment_transaction' },
      { headers: requestHeaders },
    );
  }

  // =============== paystack ==========================
  @Get('/paystack/verify/:reference')
  async verifyPaystackPayment(
    @Req() request: Request,
    @Param('reference') reference: string,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }
    return this.natsClient.send(
      { cmd: 'verify_paystack_payment' },
      { reference, headers: requestHeaders },
    );
  }
  @Get('/paystack/transactions/:reference')
  async getPaystackTransaction(
    @Req() request: Request,
    @Param('reference') reference: string,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }
    return this.natsClient.send(
      { cmd: 'get_paystack_transaction' },
      { reference, headers: requestHeaders },
    );
  }

  @Get('/paystack/transactions')
  async getPaystackTransactions(@Req() request: Request) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException(
        'Please check your login credentials and try again.',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }
    return this.natsClient.send(
      { cmd: 'get_paystack_transactions' },
      { headers: requestHeaders },
    );
  }
}
