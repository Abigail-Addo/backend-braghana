import { Controller, Inject } from '@nestjs/common';
import {
  ClientProxy,
  EventPattern,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller()
export class NotificationsMicroserviceController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVER')
    private readonly natsClient: ClientProxy,
  ) {}

  @EventPattern({
    cmd: 'get_user_notifications',
  })
  async getNotifications(@Payload() data: any) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId: data.profile.userId,
      },
    });
    return notifications;
  }

  @EventPattern({
    cmd: 'create_notification',
  })
  async createNotification(@Payload() data: any) {
    console.log({ cmd: 'createNotification message received...', data });

    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        message: data.message,
        type: data.type,
        actorId: data.actorId,
      },
    });
    return notification;
  }

  @EventPattern({
    cmd: 'comment_notification',
  })
  async commentNotification(@Payload() data: any) {
    await this.prisma.notification.create({
      data: {
        userId: data.userId,
        message: data.message,
        type: data.type,
        actorId: data.actorId,
        postId: data.postId,
      },
    });
    return 'notification';
  }

  @MessagePattern({ cmd: 'get_user_notification' })
  async getUserNotification(@Payload() data: { userId: string }) {
    if (!data || !data.userId) {
      return {
        status: 'error',
        message: 'userId is required',
      };
    }

    try {
      const notifications = await this.prisma.notification.findMany({
        where: {
          userId: data.userId,
        },
      });

      if (!notifications || notifications.length === 0) {
        return {
          status: 'success',
          message: 'No notifications found',
          notifications: [],
        };
      }

      return {
        status: 'success',
        notifications,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'An error occurred while retrieving notifications',
        error: error.message,
      };
    }
  }

  @MessagePattern({
    cmd: 'read_notification',
  })
  async readNotification(@Payload() data: any) {
    console.log({ cmd: 'readNotification message received...', data });
    const notification = await this.prisma.notification.update({
      where: {
        notificationId: data.notificationId,
        userId: data.userId,
      },
      data: {
        isRead: true,
      },
    });
    return notification;
  }

  @MessagePattern({
    cmd: 'delete_notification',
  })
  async deleteNotification(@Payload() data: any) {
    console.log({ cmd: 'deleteNotification message received...', data });
    const notification = await this.prisma.notification.delete({
      where: {
        notificationId: data.notificationId,
        userId: data.userId,
      },
    });
    return notification;
  }
}
