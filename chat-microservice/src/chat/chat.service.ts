import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'createOrFindChat' })
  async findOrCreateChat(user1Id: string, user2Id: string) {
    try {
      const chatExists = await this.prisma.chat.findFirst({
        where: {
          OR: [
            { user1Id, user2Id },
            { user1Id: user2Id, user2Id: user1Id },
          ],
        },
        include: { messages: true },
      });

      if (!chatExists) {
        console.log('Creating new chat between', user1Id, 'and', user2Id);
        const newChat = await this.prisma.chat.create({
          data: {
            user1Id,
            user2Id,
          },
        });
        return newChat;
      }

      return chatExists;
    } catch (error) {
      console.error('Error finding or creating chat:', error);
      throw new Error('Could not create or find chat');
    }
  }

  @MessagePattern('get_chat_user_test')
  async getChatUserProfile(userId: string) {
    //   send request to user service to get user details
    //  const user = await this.natsClient
    //    .send({ cmd: 'get_chat_user_profile' }, { userId })
    //    .toPromise(); // Ensure the send operation completes
    //  return user;
    console.log('from the chat services receing messages from gate way');
    return `hello world ${userId}`;
  }

  @MessagePattern({ cmd: 'getUserChats' })
  async getUserChats(@Payload() userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        messages: {
          take: 1, // Get the latest message
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!chats.length) {
      throw new NotFoundException('No chats found for this user.');
    }

    return chats;
  }

  async getUserById(userId: string): Promise<any> {
    //   send request to user service to get user details
    const user = await this.natsClient
      .send({ cmd: 'get_chat_user_profile' }, { userId })
      .toPromise(); // Ensure the send operation completes
    return user;
  }

  async createMessage(
    senderId: string,
    receiverId: string,
    chatId: string,
    content: string,
  ) {
    try {
      return await this.prisma.message.create({
        data: {
          senderId,
          receiverId,
          chatId,
          content,
        },
      });
    } catch (error) {
      console.error('Error creating message:', error);
      throw new Error('Could not create message');
    }
  }

  @MessagePattern({ cmd: 'sendMessage' })
  async sendMessage(
    @Payload()
    data: {
      chatId: string;
      senderId: string;
      receiverId: string;
      content: string;
    },
  ) {
    const { chatId, senderId, receiverId, content } = data;

    // Validate chat exists
    const chat = await this.prisma.chat.findUnique({ where: { chatId } });
    if (!chat) {
      throw new NotFoundException('Chat not found.');
    }

    // Create a message
    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        receiverId,
        content,
      },
    });

    return message;
  }

  async getChatUsers(chatId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { chatId },
    });

    if (!chat) {
      throw new Error('Chat not found');
    }

    return [
      { id: chat.user1Id, username: `User${chat.user1Id}` },
      { id: chat.user2Id, username: `User${chat.user2Id}` },
    ];
  }

  @MessagePattern({ cmd: 'getChatMessages' })
  async getChatMessages(@Payload() chatId: string) {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { sentAt: 'asc' },
    });

    if (!messages.length) {
      throw new NotFoundException('No messages found for this chat.');
    }

    return messages;
  }

  async getUserChatsWithMessages(userId: string) {
    try {
      return await this.prisma.chat.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: {
          messages: {
            orderBy: {
              sentAt: 'asc',
            },
          },
        },
      });
    } catch (error) {
      console.error('Error retrieving user chats:', error);
      throw new Error('Could not retrieve user chats');
    }
  }

  async deleteMessage(chatId: string, messageId: string, userId: string) {
    try {
      const message = await this.prisma.message.findFirst({
        where: { messageId, chatId },
      });

      if (message.senderId !== userId) {
        throw new Error('Unauthorized: Only the sender can delete the message');
      }

      if (!message) {
        throw new Error('Message not found or does not belong to this chat');
      }

      return await this.prisma.message.delete({
        where: { messageId },
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Could not delete message');
    }
  }

  @MessagePattern({ cmd: 'markMessagesAsRead' })
  async markMessagesAsRead(
    @Payload() data: { chatId: string; userId: string },
  ) {
    const { chatId, userId } = data;

    // Update all unread messages in the chat for the given user
    await this.prisma.message.updateMany({
      where: {
        chatId,
        receiverId: userId,
        deletedAt: null, // Only mark non-deleted messages
      },
      data: { deletedAt: new Date() }, // Simulate marking as read
    });

    return { success: true };
  }

  @MessagePattern({ cmd: 'deleteChat' })
  async deleteChat(@Payload() data: { chatId: string; userId: string }) {
    const { chatId, userId } = data;

    // Validate chat exists and user is a participant
    const chat = await this.prisma.chat.findUnique({
      where: { chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found.');
    }

    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      throw new UnauthorizedException(
        'You are not a participant of this chat.',
      );
    }

    await this.prisma.chat.update({
      where: { chatId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  @MessagePattern({ cmd: 'getUserChatWithMessages' })
  async getUserChatWithMessages(
    @Payload() data: { chatId: string; userId: string },
  ) {
    const { chatId, userId } = data;

    const chat = await this.prisma.chat.findFirst({
      where: {
        chatId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        messages: { orderBy: { sentAt: 'asc' } },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found.');
    }

    return chat;
  }
}
