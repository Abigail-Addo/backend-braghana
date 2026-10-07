import { Controller, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { Auth } from 'src/iam/authentication/decorator/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus } from '@prisma/client';

// @Auth(AuthType.None)
@Controller()
export class PaymentMicroserviceController {
  private readonly paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  private readonly paystackBaseUrl = 'https://api.paystack.co/transaction';

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'initiate_payment' })
  async initiatePayment(@Payload() request: any) {
    const { email, amount, fullname, numbers } = request.data;
    try {
      if (!email || !amount || isNaN(amount)) {
        throw new HttpException(
          'Invalid email or amount',
          HttpStatus.BAD_REQUEST,
        );
      }

      const { sub: userId } = request.user;

      const reference = uuidv4();

      const payment = await this.prisma.paymentTransaction.create({
        data: {
          userId,
          amount,
          reference,
          status: PaymentStatus.PENDING,
        },
      });

      const response = await axios.post(
        `${this.paystackBaseUrl}/initialize`,
        {
          email,
          amount: amount * 100, // amount in pesewas
          currency: 'GHS',
          reference,
          metadata: {
            full_name: fullname,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const { authorization_url } = response.data.data;

      //  update payment transaction
      await this.prisma.paymentTransaction.update({
        where: { reference },
        data: {
          authorization_url,
        },
      });

      return {
        data: response.data,
        payment,
        paystackUrl: authorization_url,
        reference,
        numbers,
      };
    } catch (error) {
      console.error(
        'Payment initiation failed:',
        error?.response?.data || error,
      );
      return error?.response?.data || error;
    }
  }

  @MessagePattern({ cmd: 'verify_payment' })
  async verifyPayment(@Payload() request: any) {
    const { reference } = request.data;

    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      const transaction = response.data.data;
      if (transaction.status !== 'success') {
        await this.prisma.paymentTransaction.update({
          where: { reference },
          data: { status: 'FAILED' },
        });

        throw new HttpException(
          {
            success: false,
            message: 'Payment verification failed',
            details:
              'The transaction was not successful. Please try again or use a different payment method.',
            reference,
            statusFromGateway: transaction.status,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.prisma.paymentTransaction.update({
        where: { reference },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(transaction.paid_at),
          channel: transaction.channel,
        },
      });

      return {
        status: transaction.status,
        reference,
        data: transaction,
      };
    } catch (error) {
      console.error(
        'Payment verification failed:',
        error?.response?.data || error,
      );
      return error?.response?.data || error;
    }
  }

  @MessagePattern({ cmd: 'confirm_payment' })
  async confirmPayment(@Payload() request: any) {
    const reference = request.data;

    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      const transaction = response.data.data;
      if (transaction.status !== 'success') {
        await this.prisma.paymentTransaction.update({
          where: { reference },
          data: { status: 'FAILED' },
        });

        throw new HttpException(
          {
            success: false,
            message: 'Payment verification failed',
            details:
              'The transaction was not successful. Please try again or use a different payment method.',
            reference,
            statusFromGateway: transaction.status,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.prisma.paymentTransaction.update({
        where: { reference },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(transaction.paid_at),
          channel: transaction.channel,
        },
      });

      return {
        status: transaction.status,
        reference,
        data: transaction,
      };
    } catch (error) {
      console.error(
        'Payment verification failed:',
        error?.response?.data || error,
      );
      return error?.response?.data || error;
    }
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_paystack_transactions' })
  async listAllTransactions() {
    try {
      const response = await axios.get('https://api.paystack.co/transaction', {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error(error.response ? error.response.data : error.message);
    }
  }

  @MessagePattern({ cmd: 'get_payment_transaction' })
  async getPaymentTransaction(@Payload() request: any) {
    const { sub: userId } = request.user;
    try {
      const transactions = await this.prisma.paymentTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return transactions;
    } catch (error) {
      console.error(error.response ? error.response.data : error.message);
    }
  }
}
