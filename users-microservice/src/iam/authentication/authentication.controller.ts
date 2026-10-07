import { Controller, Inject, UnauthorizedException } from '@nestjs/common';
import { HashingService } from '../hashing/hashing.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { AuthType } from './enums/auth-type.enum';
import { Auth } from './decorator/auth.decorator';
import { ActiveUserData } from '../interfaces/active-user-data.interfaces';
import { TwilioService } from '../twilio/twilio.service';

@Auth(AuthType.None)
@Controller()
export class AuthenticationUserMicroserviceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    private readonly twilioService: TwilioService,
    @Inject('NATS_SERVER')
    private readonly natsClient: ClientProxy,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  @MessagePattern({ cmd: 'signup_user' })
  async register(@Payload() data: RegisterDto): Promise<any> {
    try {
      const { phone, fullname } = data;

      let user = await this.prisma.user.findUnique({ where: { phone } });

      if (!user) {
        const username = generateUsername(fullname);
        user = await this.prisma.user.create({
          data: {
            fullname,
            username,
            phone,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } else if (!user.username) {
        const username = generateUsername(fullname);
        await this.prisma.user.update({
          where: { userId: user.userId },
          data: { username },
        });
      }

      const recentOtp = await this.prisma.otp.findFirst({
        where: {
          userId: user.userId,
          createdAt: { gte: new Date(Date.now() - 60 * 1000) },
        },
      });

      if (recentOtp) {
        return {
          status: 'error',
          message: 'Please wait before requesting a new OTP.',
        };
      }

      const token = generateOTP(8).replace(/-/g, '');
      await this.prisma.otp.create({
        data: {
          otp: token,
          userId: user.userId,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      try {
        await this.twilioService.sendOTP(
          user.phone,
          `Please enter this code to complete the login process: ${token}`,
        );

        await this.prisma.otpLog.create({
          data: {
            userId: user.userId,
            otp: token,
            status: 'sent',
            attemptedAt: new Date(),
          },
        });

        return {
          status: 'success',
          message: `Please check your phone to complete the login process. ${token}`,
        };
      } catch (error) {
        console.error(error);

        await this.prisma.otpLog.create({
          data: {
            userId: user.userId,
            otp: token,
            status: 'failed',
            attemptedAt: new Date(),
          },
        });

        return {
          status: 'error',
          message: 'Error sending OTP. Please try again later.',
          err: error.message,
        };
      }
    } catch (error) {
      console.error(error);
      return {
        status: 'error',
        message:
          'Error while registering. Please validate your input and try again.',
        errMsg: error.message,
      };
    }
  }

  @MessagePattern({ cmd: 'login_user' })
  async login(@Payload() data: LoginDto): Promise<any> {
    try {
      let { otp, phone } = data;

      otp = otp.toUpperCase();

      const user = await this.prisma.user.findUnique({
        where: { phone },
        include: {
          otps: true,
        },
      });

      if (!user) {
        return {
          status: 'error',
          message: 'No account found for the specified phone number.',
        };
      }

      // Handle multiple active OTPs: validate the latest non-expired OTP
      const validOtp = user.otps
        .filter((otpRecord) => new Date(otpRecord.expiresAt) > new Date())
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0];

      if (!validOtp || validOtp.otp.toUpperCase() !== otp) {
        await this.prisma.otpLog.create({
          data: {
            userId: user.userId,
            otp: otp,
            status: 'failed',
            attemptedAt: new Date(),
          },
        });

        return {
          status: 'error',
          message: 'Invalid or expired OTP.',
        };
      }

      await this.prisma.otpLog.create({
        data: {
          userId: user.userId,
          otp: validOtp.otp,
          status: 'success',
          attemptedAt: new Date(),
        },
      });

      await this.prisma.otp.deleteMany({
        where: { userId: user.userId },
      });

      const { accessToken, refreshToken } = await this.generateTokens(user);

      await this.prisma.user.update({
        where: { userId: user.userId },
        data: { lastLogin: new Date() },
      });

      await this.prisma.otp.deleteMany({
        where: { userId: user.userId, expiresAt: { lt: new Date() } },
      });

      return {
        status: 'success',
        message: 'Login successful.',
        data: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message:
          error.message ??
          'An error occurred during login. Please validate your credentials and try again.',
      };
    }
  }

  @MessagePattern({ cmd: 'resend_otp' })
  async resendOtp(
    @Payload() data: { phone: string },
  ): Promise<{ message: string; status?: string }> {
    try {
      const { phone } = data;

      if (!phone) {
        return {
          status: 'error',
          message: 'Please provide a valid phone number.',
        };
      }

      const user = await this.prisma.user.findUnique({
        where: { phone },
        include: {
          otps: true,
        },
      });

      if (!user) {
        return {
          status: 'error',
          message: 'No account found for the specified phone number.',
        };
      }

      const existingOtp = await this.prisma.otp.findFirst({
        where: { userId: user.userId, expiresAt: { gt: new Date() } },
      });

      if (existingOtp) {
        await this.prisma.otp.deleteMany({
          where: { userId: user.userId, expiresAt: { lt: new Date() } },
        });
      }

      const token = generateOTP(8);

      await this.prisma.otp.create({
        data: {
          otp: token,
          userId: user.userId,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      await this.twilioService.sendOTP(
        user.phone,
        `Please enter this code to complete the login process. ${token}`,
      );
      return {
        status: 'success',
        message: `OTP sent successfully. Please check your phone to complete the login process. ${token}.Enter the code without dashes.`,
      };
    } catch (error) {
      return {
        status: 'error',
        message:
          error.message ??
          'An error occurred during login. Please validate your credentials and try again.',
      };
    }
  }

  @MessagePattern({ cmd: 'refresh_tokens' })
  async refreshToken(@Payload() data: any): Promise<any> {
    try {
      const { sub } = await this.jwtService.verifyAsync<
        Pick<ActiveUserData, 'sub'>
      >(data.refreshToken, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });

      const user = await this.prisma.user.findUnique({
        where: {
          userId: sub,
        },
      });

      return this.generateTokens(user);
    } catch (error) {
      console.log({ error });
      throw new UnauthorizedException();
    }
  }

  private async signToken<T>(userId: string, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      { sub: userId, ...payload },
      {
        secret: this.jwtConfiguration.secret,
        expiresIn,
        issuer: this.jwtConfiguration.issuer,
        audience: this.jwtConfiguration.audience,
      },
    );
  }

  async generateTokens(user: { phone: string; userId: string }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserData>>(
        user.userId,
        this.jwtConfiguration.accessTokenTtl,
        {
          phone: user.phone,
        },
      ),
      this.signToken<Partial<ActiveUserData>>(
        user.userId,
        this.jwtConfiguration.refreshTokenTtl,
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}

/**
 *
 * @param num
 * @returns Six digit random number string as OTP
 */
function generateOTP(num = 8) {
  const res = Math.random().toString(36).substring(2, num);
  return res.toLocaleUpperCase();
}

/**
 * @description generate random username for the user
 * @returns username
 */

function generateUsername(fullname: string, length = 5) {
  const prefixes = [
    'Traveler',
    'Explorer',
    'Nomad',
    'Wanderer',
    'Globetrotter',
    'Voyager',
    'Backpacker',
    'Adventurer',
    'Dora',
  ];
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const namePart = fullname.replace(/\s+/g, '').toLowerCase().slice(0, 6);

  let suffix = '';
  for (let i = 0; i < length; i++) {
    suffix += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}${namePart}${suffix}`;
}

// Possible Enhancements:
// Rate limiting OTP requests per phone number.
// Adding retry limits to prevent brute force attacks.

// await this.natsClient.emit(
//   { cmd: 'send_account_verification_phone' },
//   {
//     phone,
//     subject: 'Account Verification',
//     text: `Your verification code is ${token}`,
//     html: `
//      <html>
//      <body>
//        <p>Hi ${user.username},</p>
//        <p>You requested to verify your account. Use the following code:</p>
//        <h3>${token}</h3>
//        <p>This code will expire in 30 minutes.</p>
//        <p>If you did not request this phone, please ignore it.</p>
//      </body>
//      </html>
//      `,
//   },
// );

//    await this.natsClient.emit(
//      { cmd: 'send_account_verification_phone' },
//      {
//        to: phone,
//        subject: 'Account Verification',
//        text: `Your verification code is ${token}`,
//        html: `
//    <!DOCTYPE html>
//    <html>
//    <head>
//      <title>Account Verification</title>
//      <style>
//        body {
//          font-family: sans-serif;
//          background-color: #f0f0f0;
//          color: #333;
//          margin: 0;
//          padding: 0;
//        }

//        .container {
//          max-width: 600px;
//          margin: 0 auto;
//          padding: 20px;
//          background-color: #fff;
//          border-radius: 5px;
//          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
//        }

//        h1 {
//          color: #333;
//          text-align: center;
//          margin-bottom: 20px;
//        }

//        p {
//          margin-bottom: 15px;
//        }

//        .code {
//          font-weight: bold;
//          font-size: 18px;
//          display: block;
//          text-align: center;
//          background-color:rgb(201, 212, 214);
//          margin-top: 20px;
//          padding: 10px;
//          border: 1px solid #ccc;
//          border-radius: 3px;
//        }

//        .button {
//          display: inline-block;
//          padding: 10px 20px;
//          background-color: #007bff;
//          color: #fff;
//          text-decoration: none;
//          border-radius: 3px;
//          margin-top: 20px;
//        }
//      </style>
//    </head>
//    <body>
//      <div class="container">
//        <h1>Welcome!</h1>
//        <p>Thank you for creating an account.</p>
//        <p>To verify your phone address, please enter the following code:</p>
//        <p class="code">${token}</p>
//        <p>This code will expire in 30 minutes.</p>
//        <p>If you did not request this message, please ignore it.</p>
//      </div>
//    </body>
//    <footer></footer>
//    </html>
//  `,
//      },
//    );

//   @MessagePattern({ cmd: 'verify_account' })
//   async verifyUser(@Payload() data: { token: string }): Promise<any> {
//     try {
//       const { token } = data;

//       const verificationToken = await this.prisma.otp.findUnique({
//         where: { token },
//       });

//       if (!verificationToken) {
//         throw new Error('Invalid verification token');
//       }

//       if (verificationToken.expiresAt < new Date()) {
//         //  delete token if expired
//         await this.prisma.verificationToken.delete({
//           where: { token },
//         });
//         throw new Error('Verification token has expired');
//       }

//       await this.prisma.user.update({
//         where: { userId: verificationToken.userId },
//         data: { verified: true, verifiedAt: new Date() },
//       });

//       await this.prisma.verificationToken.delete({
//         where: { token },
//       });

//       return { status: 'success', message: 'Account verified successfully' };
//     } catch (error) {
//       return { status: 'error', message: error.message };
//     }
//   }

//   @MessagePattern({ cmd: 'request_account_verification_phone' })
//   async requestVerificationPhone(@Payload() data: { phone: string }) {
//     try {
//       const { phone } = data;
//       const user = await this.prisma.user.findUnique({ where: { phone } });
//       if (!user) {
//         throw new Error('No account found for the specified user');
//       }

//       if (user.verified) {
//         throw new Error('Account already verified');
//       }

//       const token = generateVerificationToken(9);

//       //  check if user already has a token and delete it
//       await this.prisma.verificationToken.deleteMany({
//         where: { userId: user.userId },
//       });

//       await this.prisma.verificationToken.create({
//         data: {
//           token,
//           userId: user.userId,
//           expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
//         },
//       });

//       return {
//         status: 'success',
//         message:
//           'Verification code sent successfully. Please check your phone to complete the verification process.',
//       };
//     } catch (error) {
//       return { status: 'error', message: error.message };
//     }
//   }

// Forgotten Password
//   @MessagePattern({ cmd: 'forgotten_password' })
//   async forgottenPassword(@Payload() data: { phone: string }): Promise<any> {
//     try {
//       const { phone } = data;

//       const user = await this.prisma.user.findUnique({ where: { phone } });
//       if (!user) {
//         throw new UnauthorizedException('No account found with this phone');
//       }

//       const resetToken = generateVerificationToken(8);

//       await this.prisma.passwordResetToken.create({
//         data: {
//           userId: user.userId,
//           token: resetToken,
//           expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
//         },
//       });

//       await this.natsClient.send(
//         { cmd: 'send_reset_phone' },
//         {
//           to: user.phone,
//           subject: 'Password Reset Request',
//           text: `Your password reset code is: ${resetToken}`,
//           html: `
//             <p>Hi ${user.username},</p>
//             <p>You requested to reset your password. Use the following code:</p>
//             <h3>${resetToken}</h3>
//             <p>This code expires in 30 minutes.</p>
//           `,
//         },
//       );

//       return {
//         status: 'success',
//         message: 'Password reset token sent to phone ',
//       };
//     } catch (error) {
//       return {
//         status: 'error',
//         message: 'Failed to send password reset phone',
//         errMsg: error.message,
//       };
//     }
//   }

//   @MessagePattern({ cmd: 'reset_password' })
//   async resetPassword(
//     @Payload() data: { token: string; newPassword: string },
//   ): Promise<any> {
//     try {
//       const { token, newPassword } = data;

//       const user_id = await this.prisma.passwordResetToken.findUnique({
//         where: {
//           token,
//         },
//       });

//       if (!user_id) {
//         const error = new Error('Invalid token');
//         error.name = 'InvalidTokenError';
//         return {
//           status: 'error',
//           message: 'Invalid token',
//           errMsg: error.message,
//         };
//       }

//       const user = await this.prisma.user.findUnique({
//         where: { userId: user_id.userId },
//       });
//       if (!user) {
//         const error = new Error('User not found');
//         error.name = 'UserNotFoundError';
//         return {
//           status: 'error',
//           message: 'User not found',
//           errMsg: error.message,
//         };
//       }

//       const hashedPassword =
//         await this.hashingService.hashPassword(newPassword);

//       await this.prisma.user.update({
//         where: { userId: user_id.userId },
//         data: { password: hashedPassword, updatedAt: new Date() },
//       });

//       return {
//         status: 'success',
//         message:
//           'Password updated successfully. Please login with new password',
//       };
//     } catch (error) {
//       return {
//         status: 'error',
//         message: 'Failed to reset password',
//         errMsg: error.message,
//       };
//     }
//   }
