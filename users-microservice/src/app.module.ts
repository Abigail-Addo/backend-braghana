import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { IamModule } from './iam/iam.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UsersModule,
    IamModule,
    ScheduledTasksModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
