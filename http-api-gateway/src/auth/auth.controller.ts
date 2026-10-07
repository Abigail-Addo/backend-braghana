import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateUserDto, LoginDto, RefreshTokenDto } from './dtos/auth.dto';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.natsClient.send({ cmd: 'signup_user' }, createUserDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Res({ passthrough: true }) response: Response,
    @Body() loginDto: LoginDto,
  ) {
    try {
      const result: any = await firstValueFrom(
        this.natsClient.send({ cmd: 'login_user' }, loginDto),
      );

      if (result.status !== 'success') {
        throw new UnauthorizedException(result.message || 'Login failed.');
      }

      const { accessToken } = result.data;

      // Set the access token in a secure HTTP-only cookie
      response.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      return result;
    } catch (error) {
      console.error('Error during login:', error);
      const message = {
        error: error.message || 'Login failed.',
        msg: 'Please check your credentials and try again.',
      };
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return { statusCode, message };
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend/otp')
  resendOtp(@Body('phone') phone: string) {
    return this.natsClient.send({ cmd: 'resend_otp' }, { phone });
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify')
  requestAccountVerificationPhone(@Body('phone') phone: string) {
    return this.natsClient.send(
      { cmd: 'request_account_verification_phone' },
      { phone },
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-tokens')
  refreshTokens(
    @Res({ passthrough: true }) response: Response,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    const { refreshToken } = refreshTokenDto;

    return this.natsClient.send(
      { cmd: 'refresh_tokens' },
      {
        refreshToken,
      },
    );
  }
}
