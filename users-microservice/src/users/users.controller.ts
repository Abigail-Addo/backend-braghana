import { Controller, Inject, UnauthorizedException } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { Auth } from 'src/iam/authentication/decorator/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { ActiveUserData } from 'src/iam/interfaces/active-user-data.interfaces';
import { PrismaService } from 'src/prisma/prisma.service';

// @Auth(AuthType.None)
@Controller()
export class UsersMicroserviceController {
  constructor(
    private readonly prisma: PrismaService,

    @Inject('NATS_SERVER')
    private readonly natsClient: ClientProxy,
  ) {}

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'fetch_all_users' })
  async getAllUsers() {
    const users = await this.prisma.user.findMany();
    return users;
  }

  @MessagePattern({ cmd: 'upload_user_avatar' })
  async uploadUserAvatar(@Payload() data: any) {
    const user = await this.prisma.user.findUnique({
      where: {
        userId: data.user.sub,
      },
    });

    if (user.profilePictureUrl !== null && user.profilePictureUrl !== '') {
      this.natsClient.emit(
        { cmd: 'delete_user_avatar' },
        {
          public_id: user.public_id,
        },
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        userId: data.user.sub,
      },
      data: {
        profilePictureUrl: data.data.url,
        public_id: data.data.public_id,
        fullname:
          data.data.fullname !== null ? data.data.fullname : user.fullname,
        bio: data.data.bio !== null ? data.data.bio : user.bio,
      },
    });

    return {
      message: 'Profile updated successfully',
      updatedUser,
    };
  }

  @MessagePattern({ cmd: 'update_user' })
  async updateUser(@Payload() data: any) {
    const { params, body, user } = data;
    const { id } = params;

    if (user.sub !== id) {
      const error = new UnauthorizedException(
        " You don't have permission to update this user",
      );

      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    const updatedUser = await this.prisma.user.update({
      where: { userId: user.sub },
      data: body,
    });

    return updatedUser;
  }

  @MessagePattern({ cmd: 'delete_user' })
  async deleteUser(@Payload() data: any) {
    const { params, user } = data;

    if (user.sub !== params.id) {
      const error = new UnauthorizedException(
        " You don't have permission to delete this user",
      );

      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    const deletedUser = await this.prisma.user.delete({
      where: { userId: user.sub },
    });
    return {
      message: `${deletedUser.fullname} account deleted successfully`,
    };
  }

  @MessagePattern({ cmd: 'get_user_profile' })
  async getUserProfile(@Payload() request: any) {
    const user: ActiveUserData = request.user;

    const profile = await this.prisma.user.findUnique({
      where: {
        userId: user.sub,
      },
      include: {
        followers: true,
        followings: true,
      },
    });
    if (!profile) {
      return { message: 'No account found for the specified user.' };
    }

    return { data: profile };
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_chat_user_profile' })
  async getChatUserProfile(@Payload() request: any) {
    const profile = await this.prisma.user.findUnique({
      where: {
        userId: request.userId,
      },
      include: {
        followers: true,
        followings: true,
      },
    });
    if (!profile) {
      return { message: 'No account found for the specified user.' };
    }

    return { data: profile };
  }

  @MessagePattern({ cmd: 'follow_or_unfollow' })
  async followOrUnfollowUser(@Payload() request: any) {
    const userId = request.user?.sub; // Logged-in user's ID
    const userToFollowId = request.params?.id; // ID of the target user

    if (!userId) {
      throw new Error(
        'You must be logged in to perform this action. Please login.',
      );
    }

    // Prevent self-following
    if (userId === userToFollowId) {
      throw new Error('You cannot follow or unfollow yourself.');
    }

    // Check if the user to follow exists
    const userToFollow = await this.prisma.user.findUnique({
      where: { userId: userToFollowId },
      select: { fullname: true, userId: true, username: true },
    });

    if (!userToFollow) {
      throw new Error('No account found for the specified user.');
    }

    try {
      return await this.prisma.$transaction(async (prisma) => {
        // Check if the logged-in user is already following the target user
        const existingFollow = await prisma.followers.findFirst({
          where: {
            userId: userId, // Logged-in user
            followingId: userToFollowId, // Target user
          },
        });

        if (!existingFollow) {
          // Follow the user
          const follower = await prisma.followers.create({
            data: {
              userId: userId, // Logged-in user (follower)
              followingId: userToFollowId, // Target user (following)
            },
          });

          // Emit a follow notification
          this.natsClient.emit(
            { cmd: 'create_notification' },
            {
              type: 'follow',
              message: `You have followed ${userToFollow.username || 'this user'}.`,
              userId: userToFollowId,
              actorId: userId,
            },
          );

          return {
            message: `You have followed ${userToFollow.username || 'this user'}.`,
            follower,
          };
        } else {
          // Unfollow the user
          await prisma.followers.delete({
            where: {
              userId_followingId: {
                userId: userId,
                followingId: userToFollowId,
              },
            },
          });

          // Emit an unfollow notification
          this.natsClient.emit(
            { cmd: 'create_notification' },
            {
              type: 'unfollow',
              message: `You have unfollowed ${userToFollow.username || 'this user'}.`,
              userId: userToFollowId,
              actorId: userId,
            },
          );

          return {
            message: `You have unfollowed ${userToFollow.username || 'this user'}.`,
          };
        }
      });
    } catch (error) {
      console.error('Error while following/unfollowing user:', error);
      throw new Error(
        'Unable to follow/unfollow at this time. Please try again later.',
      );
    }
  }

  @MessagePattern({ cmd: 'report_user' })
  async reportUser(@Payload() request: any) {
    const userId = request.user?.sub; // ID of the logged-in user
    const targetUserId = request.params?.id; // ID of the user to be reported
    const reason = request.body?.reason?.trim();

    if (!userId) {
      throw new Error('You must be logged in to report a user. Please login.');
    }

    if (userId === targetUserId) {
      throw new Error('You cannot report yourself.');
    }

    if (!reason || reason.length < 3) {
      throw new Error('Please provide a valid reason for reporting.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { userId: targetUserId },
      select: { fullname: true, userId: true, username: true },
    });

    if (!targetUser) {
      throw new Error('No account found for the specified user.');
    }

    try {
      return await this.prisma.$transaction(async (prisma) => {
        const existingReport = await prisma.reportedUser.findFirst({
          where: {
            reporterId: userId,
            reportedUserId: targetUserId,
          },
        });

        if (existingReport) {
          return {
            message: `You have already reported ${targetUser.username || 'this user'} for: ${existingReport.reason}`,
          };
        }

        // Create a new report
        const report = await prisma.reportedUser.create({
          data: {
            reporterId: userId,
            reportedUserId: targetUserId,
            reason,
          },
        });

        this.natsClient.emit(
          { cmd: 'create_notification' },
          {
            type: 'report',
            message: `You have reported ${targetUser.username || 'this user'}.`,
            userId: targetUserId,
            actorId: userId,
          },
        );

        return {
          message: `You have successfully reported ${targetUser.username || 'this user'}.`,
          report,
        };
      });
    } catch (error) {
      console.error('Error while reporting user:', error);
      throw new Error(
        'Unable to report the user at this time. Please try again later.',
      );
    }
  }

  // ================== news letters ================

  @MessagePattern({ cmd: 'create_newsletter' })
  async createNewsletter(@Payload() newsLetterDto: any) {
    const letter = await this.prisma.newsletter.create({
      data: {
        title: newsLetterDto.body.title,
        description: newsLetterDto.body.description,
      },
    });

    return letter;
  }

  @MessagePattern({ cmd: 'get_all_newsletters' })
  async getAllNewsletters() {
    const newsletters = await this.prisma.newsletter.findMany();
    return newsletters;
  }

  @MessagePattern({ cmd: 'update_newsletter' })
  async updateNewsletter(@Payload() updateNewsletterDto: any) {
    const { newsletterId, title, description, isActive } =
      updateNewsletterDto.body;

    const letter = await this.prisma.newsletter.update({
      where: { newsletterId },
      data: {
        title,
        description,
        isActive,
      },
    });

    return {
      status: 'success',
      message: 'Newsletter updated successfully.',
      data: letter,
    };
  }

  @MessagePattern({ cmd: 'delete_newsletter' })
  async deleteNewsletter(
    @Payload()
    { body }: { body: { newsletterId: string } },
  ) {
    const { newsletterId } = body;

    await this.prisma.newsletter.delete({
      where: { newsletterId },
    });

    return { status: 'success', message: 'Newsletter deleted successfully.' };
  }

  // ================ subscribers ==================
  @MessagePattern({ cmd: 'subscribe_to_newsletter' })
  async subscribeToNewsletter(
    @Payload()
    request: any,
  ) {
    const userId = request.user.sub;
    const newsletterId = request.body.newsletterId;
    const subscription = await this.prisma.newsletterUser.upsert({
      where: {
        userId_newsletterId: { userId, newsletterId },
      },
      create: {
        userId,
        newsletterId,
        subscribedAt: new Date(),
      },
      update: {
        unsubscribedAt: null, // Resubscribe if previously unsubscribed
      },
    });

    return subscription;
  }

  @MessagePattern({ cmd: 'unsubscribe_from_newsletter' })
  async unsubscribeFromNewsletter(
    @Payload()
    request: any,
  ) {
    const userId = request.user.sub;
    const newsletterId = request.body.newsletterId;
    const subscription = await this.prisma.newsletterUser.update({
      where: {
        userId_newsletterId: { userId, newsletterId },
      },
      data: {
        unsubscribedAt: new Date(),
      },
    });

    return {
      status: 'success',
      message: 'Unsubscribed from newsletter successfully.',
      data: subscription,
    };
  }

  @MessagePattern({ cmd: 'get_newsletter_subscribers' })
  async getNewsletterSubscribers(
    @Payload() { newsletterId }: { newsletterId: string },
  ) {
    const subscribers = await this.prisma.newsletterUser.findMany({
      where: { newsletterId, unsubscribedAt: null },
      include: { user: true },
    });

    return subscribers.map((subscriber) => ({
      userId: subscriber.userId,
      fullname: subscriber.user.fullname,
      email: subscriber.user.email,
    }));
  }

  @MessagePattern({ cmd: 'get_user_subscriptions' })
  async getUserSubscriptions(@Payload() request: any) {
    const userId = request.user.sub;
    const id = request.body.userId;

    if (userId !== id) {
      const error = new UnauthorizedException(
        'You are not authorized to perform this action',
      );
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    const subscriptions = await this.prisma.newsletterUser.findMany({
      where: { userId, unsubscribedAt: null },
      include: { newsletter: true },
    });

    return subscriptions.map((subscription) => ({
      newsletterId: subscription.newsletterId,
      title: subscription.newsletter.title,
      description: subscription.newsletter.description,
      subscribedAt: subscription.subscribedAt,
    }));
  }

  @MessagePattern({ cmd: 'check_subscription_status' })
  async checkSubscriptionStatus(
    @Payload()
    { userId, newsletterId }: { userId: string; newsletterId: string },
  ) {
    const subscription = await this.prisma.newsletterUser.findUnique({
      where: {
        userId_newsletterId: { userId, newsletterId },
      },
    });

    return {
      isSubscribed: subscription ? subscription.unsubscribedAt === null : false,
    };
  }
}
