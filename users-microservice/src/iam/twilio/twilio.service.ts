import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private twilioClient: Twilio;

  constructor(private readonly configService: ConfigService) {
    this.twilioClient = new Twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  /**
   * Send SMS using Twilio
   * @param phoneNumber - The recipient's phone number (E.164 format, e.g., +233319876543)
   * @param message - The SMS message body
   * @returns Promise<any>
   */
  async sendOTP(phoneNumber: string, message: string): Promise<any> {
    try {
      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      const result = await this.twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: phoneNumber,
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        result,
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw new Error('Failed to send SMS');
    }
  }
}
