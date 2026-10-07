import {
  ConflictException,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { Auth } from 'src/iam/authentication/decorator/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LotteryStatus } from './enums/lottery-status.enum';

@Controller()
export class LotteryMicroserviceController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'create_bet' })
  async placeBet(@Payload() request: any) {
    try {
      const { numbers, stakeAmount, paymentReference } = request.data;
      const { sub: userId } = request.user;
      const requestHeaders = request.headers;

      if (!Array.isArray(numbers) || numbers.length < 1 || numbers.length > 5) {
        throw new HttpException(
          {
            statusCode: 400,
            message:
              'Invalid bet: You must select at least 5 numbers between 1 and 50.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!stakeAmount || isNaN(stakeAmount) || Number(stakeAmount) <= 0) {
        throw new HttpException(
          {
            statusCode: 400,
            message: 'Invalid stake amount.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!paymentReference) {
        throw new HttpException(
          {
            statusCode: 400,
            message: 'Payment reference is required.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!userId) {
        throw new UnauthorizedException('User authentication failed.');
      }

      if (!requestHeaders.authorization) {
        throw new UnauthorizedException(
          ' Please check your login credentials and try again.',
        );
      }

      const startOfWeek = new Date();
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      let currentDraw = await this.prisma.draw.findFirst({
        where: {
          drawDate: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
      });

      if (!currentDraw) {
        currentDraw = await this.prisma.draw.create({
          data: { drawDate: startOfWeek },
        });
      }

      //  verify payment
      let paymentVerification;
      try {
        paymentVerification = await this.natsClient
          .send(
            { cmd: 'confirm_payment' },
            { data: paymentReference, headers: requestHeaders },
          )
          .toPromise();
      } catch (err) {
        throw new HttpException(
          {
            statusCode: 502,
            message: 'Failed to confirm payment from payment service.',
            error: err?.response?.data || err.message,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      if (!paymentVerification || paymentVerification.status !== 'success') {
        throw new HttpException(
          {
            statusCode: 502,
            message:
              'Payment verification failed or payment not successful. Please try again or use a different payment method.',
            reference: paymentVerification.reference,
            statusFromGateway: paymentVerification.status,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingBet = await this.prisma.bet.findUnique({
        where: { paymentReference },
      });

      if (existingBet) {
        throw new ConflictException(
          'This payment reference has already been used to place a bet.',
        );
      }

      let bet;
      try {
        bet = await this.prisma.bet.create({
          data: {
            userId,
            numbers,
            stakeAmount,
            drawId: currentDraw.drawId,
            paymentReference: paymentVerification?.data?.reference,
            paymentStatus: paymentVerification?.data?.status.toUpperCase(),
          },
        });
      } catch (error) {
        if (
          error.code === 'P2002' &&
          error.meta?.target?.includes('paymentReference')
        ) {
          throw new ConflictException(
            'Duplicate payment reference — this payment has already been used.',
          );
        }
        throw error;
      }

      return {
        success: true,
        message: 'Bet placed successfully. Please wait for the draw on Sunday.',
        data: bet,
      };
    } catch (error) {
      // console.error('Bet placement error:', error);
      return {
        success: false,
        message: error?.message || 'An unexpected error occurred.',
        statusCode: error?.status || 500,
        status: error?.response?.statusFromGateway,
      };
    }
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_all_bets' })
  async getAllBets() {
    return this.prisma.bet.findMany({
      include: {
        draw: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @MessagePattern({ cmd: 'get_user_bets' })
  async getUserBets(@Payload() data: any) {
    const userId = data.user.sub;
    const paramId = data.userId;

    if (userId !== paramId) {
      throw new Error("You don't have permission to view this user's bets.");
    }

    const bets = this.prisma.bet.findMany({
      where: { userId },
      include: { draw: true },
      orderBy: { createdAt: 'desc' },
    });

    return bets;
  }

  @MessagePattern({ cmd: 'get_won_bets' })
  async getWonBets(@Payload() data: any) {
    const userId = data.user.sub;
    const paramId = data.userId;

    if (userId !== paramId) {
      throw new Error("You don't have permission to view this user's bets.");
    }

    return this.prisma.bet.findMany({
      where: {
        userId,
        status: LotteryStatus.WON,
      },
      include: { draw: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @MessagePattern({ cmd: 'get_lost_bets' })
  async getLostBets(@Payload() data: any) {
    const userId = data.user.sub;
    const paramId = data.userId;

    if (userId !== paramId) {
      throw new Error("You don't have permission to view this user's bets.");
    }

    return this.prisma.bet.findMany({
      where: {
        userId,
        status: LotteryStatus.LOST,
      },
      include: { draw: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @MessagePattern({ cmd: 'get_pending_bets' })
  async getPendingBets(@Payload() data: any) {
    const userId = data.user.sub;
    const paramId = data.userId;

    if (userId !== paramId) {
      throw new Error("You don't have permission to view this user's bets.");
    }

    return this.prisma.bet.findMany({
      where: {
        userId,
        status: LotteryStatus.PENDING,
      },
      include: { draw: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @MessagePattern({ cmd: 'delete_bet' })
  async deleteBet(@Payload() data: any) {
    const userId = data.user.sub;
    const betId = data.betId;

    try {
      const bet = await this.prisma.bet.findUnique({ where: { betId } });

      if (!bet) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Bet not found.',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (bet.userId !== userId) {
        throw new HttpException(
          {
            statusCode: 403,
            message: 'You do not have permission to delete this bet.',
            error: 'Forbidden',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (bet.status === 'PENDING') {
        throw new HttpException(
          {
            statusCode: 403,
            message: 'You cannot delete a pending bet.',
            error: 'Forbidden',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      await this.prisma.bet.delete({ where: { betId } });
      return { msg: 'Bet deleted successfully.' };
    } catch (error) {
      console.error('Error deleting bet:', error);
      if (error instanceof HttpException) {
        return error;
      }

      return {
        message: {
          msg: 'An unexpected error occurred while deleting the bet.',
          error: error.message,
        },
        error: 'Internal Server Error',
      };
      // throw new HttpException(
      //   {
      //     message: {
      //       msg: 'An unexpected error occurred while deleting the bet.',
      //       error: error.message,
      //     },
      //     error: 'Internal Server Error',
      //   },
      //   HttpStatus.INTERNAL_SERVER_ERROR,
      // );
    }
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_statistics' })
  async getStatistics() {
    const totalBets = await this.prisma.bet.count();
    const totalDraws = await this.prisma.draw.count();
    const latestDraw = await this.prisma.draw.findFirst({
      orderBy: { drawDate: 'desc' },
    });
    return {
      totalBets,
      totalDraws,
      latestDraw,
    };
  }

  @MessagePattern({ cmd: 'get_draw_bets' })
  async getDrawBets(@Payload() data: any) {
    const { drawId } = data;
    return this.prisma.bet.findMany({
      where: { drawId },
      include: { draw: true },
    });
  }

  @MessagePattern({ cmd: 'get_latest_draw' })
  async getLatestDraw() {
    return this.prisma.draw.findFirst({
      orderBy: { drawDate: 'desc' },
      include: {
        Bet: true,
      },
    });
  }

  /**
   * Weekly lottery draw.
   */

  @Cron(CronExpression.EVERY_WEEK) // Runs every Sunday at 12:00 AM
  async performLotteryDraw() {
    console.log('🎰 Performing weekly lottery draw...');

    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Move to Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      let currentDraw = await this.prisma.draw.findFirst({
        where: {
          drawDate: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
      });

      if (!currentDraw) {
        currentDraw = await this.prisma.draw.create({
          data: {
            drawDate: startOfWeek,
          },
        });
      }

      if (currentDraw.winningNumber !== null) {
        console.log(
          ` Draw ${currentDraw.drawId} already has a winning number. Skipping...`,
        );
        return;
      }

      const winningNumber = Math.floor(Math.random() * 50) + 1;

      const winningBets = await this.prisma.bet.findMany({
        where: {
          drawId: currentDraw.drawId,
          numbers: { has: winningNumber },
        },
      });

      const winnerBet =
        winningBets.length > 0
          ? winningBets[Math.floor(Math.random() * winningBets.length)]
          : null;

      await this.prisma.draw.update({
        where: { drawId: currentDraw.drawId },
        data: {
          winningNumber,
          winnerId: winnerBet ? winnerBet.userId : null,
        },
      });

      console.log(
        `Draw ${currentDraw.drawId}: Winning Number: ${winningNumber}`,
      );

      if (winnerBet) {
        console.log(`Winner Selected: User ID ${winnerBet.userId}`);

        await this.prisma.bet.update({
          where: { betId: winnerBet.betId },
          data: { status: LotteryStatus.WON },
        });
      } else {
        console.log('No winners this week.');
      }

      await this.prisma.bet.updateMany({
        where: {
          drawId: currentDraw.drawId,
          status: LotteryStatus.PENDING,
        },
        data: { status: LotteryStatus.LOST },
      });

      console.log('All bets for this week have been finalized.');
    } catch (error) {
      console.error('Error in lottery draw:', error);
    }
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_all_draws' })
  async getAllDraws(): Promise<
    | { data: any; msg: string }
    | { error: string; msg: string; statusCode: number }
  > {
    try {
      const draws = await this.prisma.draw.findMany({
        include: {
          Bet: true,
        },
        orderBy: {
          drawDate: 'desc',
        },
      });

      return {
        data: draws,
        msg: 'All draws fetched successfully.',
      };
    } catch (error) {
      console.error('⚠️ Error fetching draws:', error);
      return {
        error: 'Internal Server Error',
        msg: 'Failed to fetch draws. Please try again.',
        statusCode: 500,
      };
    }
  }
}
