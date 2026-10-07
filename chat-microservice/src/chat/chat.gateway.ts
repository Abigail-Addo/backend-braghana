import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  private activeUsers = new Map<string, Socket>();

  async handleConnection(socket: Socket) {
    await this.natsClient.connect();
    try {
      const token = this.extractTokenFromSocket(socket);
      const decodedToken = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      if (!decodedToken || !decodedToken.sub) {
        throw new UnauthorizedException('Invalid token');
      }

      // await this.natsClient
      //   .send({ cmd: 'get_chat_user_test' }, { userId: decodedToken.sub })
      //   .toPromise();

      const user = await this.chatService.getUserById(decodedToken.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Store the user's connection
      this.activeUsers.set(user.data.userId, socket);
      socket.data.user = user.data;

      // fetch user chats and send the user their chats when connected
      const chats = await this.chatService.getUserChatsWithMessages(
        user.data.userId,
      );
      socket.emit('userChats', chats);
      socket.emit(
        'userChats',
        `Welcome back to the chat app, ${user.data.fullname}`,
      );

      console.log(`User connected: ${user.data.fullname}`);
    } catch (err) {
      console.error('Connection refused:', err.message);
      socket.emit('error', { message: err.message });
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const user = socket.data.user;
    if (user) {
      this.activeUsers.delete(user.id);
      console.log(`User disconnected: ${user.username}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const { content, recipientId } = data;

      if (!content || !recipientId) {
        throw new Error('Content and recipientId are required');
      }

      const sender = socket.data.user;

      if (!sender || !sender.userId) {
        throw new Error('Unauthorized: Sender not authenticated');
      }

      const recipient = await this.chatService.getUserById(recipientId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }

      const chat = await this.chatService.findOrCreateChat(
        sender.userId,
        recipientId,
      );

      const message = await this.chatService.createMessage(
        sender.userId,
        recipientId,
        chat.chatId,
        content,
      );

      const chatUsers = await this.chatService.getChatUsers(chat.chatId);
      for (const user of chatUsers) {
        const recipientSocket = this.activeUsers.get(user.id);
        if (recipientSocket) {
          recipientSocket.emit('newMessage', message);
        }
      }
    } catch (error) {
      console.error('Error handling message:', error.message);
      socket.emit('error', { message: error.message });
    }
  }

  private extractTokenFromSocket(socket: Socket): string {
    const authorization = socket.handshake.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid token format');
    }

    return token;
  }
}
