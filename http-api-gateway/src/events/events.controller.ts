import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Request,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AddEventDto, UpdateEventDto } from './dtos/add-event-dto';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('events')
export class EventsController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'video/mp4',
          'video/mkv',
          'video/avi',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Only image and video files are allowed'),
            false,
          );
        }

        if (file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024) {
          return callback(
            new BadRequestException('Images must not exceed 1 MB'),
            false,
          );
        }

        if (
          file.mimetype.startsWith('video/') &&
          file.size > 10 * 1024 * 1024
        ) {
          return callback(
            new BadRequestException('Videos must not exceed 20 MB'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async publishEvent(
    @UploadedFile() file: Express.Multer.File,
    @Request() request: any,
    @Body() data: AddEventDto,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    if (!file) {
      return this.natsClient.send(
        { cmd: 'publish' },
        { data, headers: requestHeaders },
      );
    }

    const result = await this.cloudinaryService.uploadFile(file);

    return this.natsClient.send(
      { cmd: 'publish_with_img' },
      {
        data: {
          ...data,
          url: result.secure_url,
          public_id: result.public_id,
        },
        headers: requestHeaders,
      },
    );
  }

  @Get()
  getEvents(@Request() request: any) {
    const requestHeaders = request.headers;
    const queryParams = request.query;

    return this.natsClient.send(
      { cmd: 'get_events' },
      { headers: requestHeaders, queryParams },
    );
  }

  @Post(':id/save')
  saveEvent(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'save_event' },
      { headers: requestHeaders, params: { id } },
    );
  }

  @Get('saved')
  getSavedEvents(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_saved_events' },
      { headers: requestHeaders },
    );
  }

  @Get(':id')
  getEventById(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_event_by_id' },
      { headers: requestHeaders, params: { id } },
    );
  }

  @Put(':id')
  updateEvent(
    @Request() request: any,
    @Param('id') id: string,
    @Body() data: UpdateEventDto,
  ) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'update_event' },
      { headers: requestHeaders, params: { id }, data },
    );
  }

  @Delete(':id/:imgId?')
  async deleteEvent(
    @Request() request: any,
    @Param('id') id: string,
    @Param('imgId') imgId: string,
  ) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    if (imgId) {
      await this.cloudinaryService.deleteFile(imgId);
      return this.natsClient.send(
        { cmd: 'delete_event' },
        { headers: requestHeaders, params: { id } },
      );
    }

    return this.natsClient.send(
      { cmd: 'delete_event' },
      { headers: requestHeaders, params: { id } },
    );
  }
}
