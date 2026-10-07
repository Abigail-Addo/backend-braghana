import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { PrismaService } from './prisma/prisma.service';
import { IamModule } from './iam/iam.module';

@Module({
  imports: [ConfigModule.forRoot(), ChatModule, IamModule],
  providers: [PrismaService],
})
export class AppModule {}
