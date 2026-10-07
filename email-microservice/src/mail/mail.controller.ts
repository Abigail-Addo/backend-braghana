import { Controller } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class MailMicroserviceController {
  constructor(private readonly configService: ConfigService) {}
  mailTransport() {
    const transport = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    //  const transport = nodemailer.createTransport({
    //    service: 'gmail',
    //    auth: {
    //      user: this.configService.get<string>('USER_MAIL_ID'),
    //      pass: this.configService.get<string>('USER_SECRET'),
    //    },
    //  });

    return transport;
  }

  async mailService(data: any) {
    const transport = this.mailTransport();
    const { to, subject, text, html } = data;
    const mailOptions = {
      from: this.configService.get<string>('DEFAULT_MAIL_FROM'),
      to,
      subject,
      text,
      html,
    };

    try {
      const result = await transport.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.log({ error });
      return {
        status: false,
        message: error.message,
        statusCode: 400,
      };
    }
  }

  @EventPattern({ cmd: 'send_account_verification_email' })
  async sendAccountVerificationEmail(@Payload() data: any) {
    //  console.log('data', data);
    const result = await this.mailService(data);
    return result;
  }

  @EventPattern({ cmd: 'send_reset_email' })
  async sendPasswordResetEmail(@Payload() data: any) {
    //  console.log('data', data);
    const result = await this.mailService(data);
    return result;
  }
}
