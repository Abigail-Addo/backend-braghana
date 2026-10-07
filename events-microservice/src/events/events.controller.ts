import {
  Controller,
  Inject,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { Auth } from 'src/iam/authentication/decorator/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { PrismaService } from 'src/prisma/prisma.service';

enum Category {
  Free = 'Free',
  Paid = 'Paid',
}

@Controller()
export class EventsMicroServiceController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'publish' })
  async createEvent(@Payload() request: any) {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Please login');
    }

    try {
      const createdEvent = await this.prisma.event.create({
        data: {
          userId: userId,
          title: request.data.title,
          description: request.data.description,
          category: request.data.category,
          location: request.data.location,
          price: request.data.price,
          eventDate: request.data.eventDate,
          eventTime: request.data.eventTime,
          registrationLink: request.data.registrationLink,
        },
      });
      return createdEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new InternalServerErrorException();
    }
  }

  @MessagePattern({ cmd: 'publish_with_img' })
  async createEventWithImg(@Payload() request: any) {
    const userId = request.user?.sub;

    let price: number | string;
    if (request.data.price === 'Free' || request.data.category === 'Free') {
      price = 0;
    } else {
      price = parseInt(request.data.price);
    }

    if (!userId) {
      throw new UnauthorizedException('Please login');
    }

    try {
      const createdEvent = await this.prisma.event.create({
        data: {
          userId: userId,
          title: request.data.title,
          description: request.data.description,
          eventImg: request.data.url,
          public_id: request.data.public_id,
          category: request.data.category || Category.Free,
          location: request.data.location,
          price: price,
          eventDate: request.data.eventDate,
          eventTime: request.data.eventTime,
          registrationLink: request.data.registrationLink,
          views: request.data.views || 0,
        },
      });
      return createdEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new InternalServerErrorException();
    }
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_events' })
  async getEvents(data: { queryParams: any }) {
    const { queryParams } = data;

    const { category, price, location } = queryParams;

    const filterConditions: any = {};
    if (category) {
      filterConditions.category = category;
    }
    if (price) {
      filterConditions.price = {
        lte: parseFloat(price),
      };
    }
    if (location) {
      filterConditions.location = location;
    }

    const events = await this.prisma.event.findMany({
      where: filterConditions,
      orderBy: {
        eventTime: 'asc',
      },
    });

    if (events.length === 0) {
      return { message: 'No events found', data: events };
    }

    return events;
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_event_by_id' })
  async getEvent(@Payload() request: any) {
    const eventId = request.params.id;
    try {
      const event = await this.prisma.event.findUnique({
        where: {
          eventId,
        },
      });
      if (!event) {
        return { message: 'Event not found', data: event };
      }
      await this.prisma.event.update({
        where: {
          eventId,
        },
        data: {
          views: {
            increment: 1,
          },
        },
      });
      return event;
    } catch (error) {
      console.error('Error getting event:', error);
      throw new InternalServerErrorException();
    }
  }

  @MessagePattern({ cmd: 'save_event' })
  async saveEvent(@Payload() request: any) {
    const userId = request.user?.sub;
    const eventId = request.params.id;

    if (!userId) {
      throw new UnauthorizedException('Please login');
    }
    try {
      const existingSave = await this.prisma.savedEvent.findFirst({
        where: {
          userId: userId,
          eventId: eventId,
        },
      });

      if (existingSave) {
        await this.prisma.savedEvent.delete({
          where: { saveId: existingSave.saveId },
        });
        await this.prisma.event.update({
          where: {
            eventId: eventId,
          },
          data: {
            views: {
              increment: 1,
            },
          },
        });
        return { message: 'Event has been unsaved.' };
      }

      const savedEvent = await this.prisma.savedEvent.create({
        data: {
          userId: userId,
          eventId: eventId,
        },
      });
      await this.prisma.event.update({
        where: {
          eventId: eventId,
        },
        data: {
          views: {
            increment: 1,
          },
        },
      });
      return savedEvent;
    } catch (error) {
      console.error('Error saving event:', error);
      throw new InternalServerErrorException();
    }
  }

  @MessagePattern({ cmd: 'get_saved_events' })
  async getSavedEvents(@Payload() request: any) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Please login');
    }
    try {
      const savedEvents = await this.prisma.savedEvent.findMany({
        where: {
          userId: userId,
        },
      });

      if (savedEvents.length === 0) {
        return { message: 'No saved events found', data: savedEvents };
      }
      return savedEvents;
    } catch (error) {
      console.error('Error getting saved events:', error);
      throw new InternalServerErrorException();
    }
  }

  @MessagePattern({ cmd: 'update_event' })
  async updateEvent(@Payload() request: any) {
    const eventId = request.params.id;
    const userId = request.user?.sub;

    const event = await this.prisma.event.findUnique({
      where: {
        eventId,
        userId,
      },
    });

    if (!event) {
      return { message: 'Event not found', data: [] };
    }
    if (event.userId !== userId) {
      throw new UnauthorizedException(
        'Unauthorized. you cannot update this event',
      );
    }

    //   only provided fields should be updated
    const updatedObj: any = {};
    const fields = [
      'title',
      'description',
      'category',
      'location',
      'price',
      'eventTime',
      'eventDate',
    ];

    fields.forEach((field) => {
      if (request.data[field] !== undefined) {
        updatedObj[field] = request.data[field] ?? event[field];
      }
    });

    const updatedEvent = await this.prisma.event.update({
      where: {
        eventId,
        userId,
      },
      data: {
        ...updatedObj,
        updatedAt: new Date(),
      },
    });
    return updatedEvent;
  }

  @MessagePattern({ cmd: 'delete_event' })
  async deleteEvent(@Payload() request: any) {
    const eventId = request.params.id;
    const userId = request.user?.sub;
    const event = await this.prisma.event.findUnique({
      where: {
        eventId,
        userId,
      },
    });

    //   if no event is found
    if (!event) {
      return { message: 'Event not found', data: event };
    }
    if (event.userId !== userId) {
      throw new UnauthorizedException(
        'Unauthorized. you cannot delete this event',
      );
    }
    const deletedEvent = await this.prisma.event.delete({
      where: {
        eventId,
      },
    });

    return {
      message: 'Event deleted successfully',
      data: deletedEvent,
    };
  }
}
