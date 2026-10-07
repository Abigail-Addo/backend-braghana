import { Injectable } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduledTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async removeExpiredOtps() {
    const currentTime = new Date();

    console.log(currentTime);

    const deletedOtpCount = await this.prisma.otp.deleteMany({
      where: {
        expiresAt: {
          lt: currentTime,
        },
      },
    });

    console.log(`Deleted ${deletedOtpCount.count} expired OTPs`);
  }

  scheduleOtpCleanup() {
    cron.schedule('*/30 * * * *', async () => {
      console.log('Running OTP cleanup job...');
      await this.removeExpiredOtps();
    });
  }
}
