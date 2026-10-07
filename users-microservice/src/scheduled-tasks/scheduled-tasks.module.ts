import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [ScheduledTasksService, PrismaService], // Add the service and Prisma service
})
export class ScheduledTasksModule implements OnModuleInit {
  constructor(private readonly scheduledTasksService: ScheduledTasksService) {}

  // Start the cron job when the module is initialized
  onModuleInit() {
    this.scheduledTasksService.scheduleOtpCleanup(); // Start the cron job
  }
}
