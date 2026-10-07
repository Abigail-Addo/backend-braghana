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
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @Put('update/:public_id?')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png'];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Only image and video files are allowed'),
            false,
          );
        }

        // Handle size-specific logic
        if (file.mimetype.startsWith('image/') && file.size > 1 * 1024 * 1024) {
          return callback(
            new BadRequestException('Images must not exceed 1 MB'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() request: any,
    @Body() body: any,
    @Param('public_id') public_id?: string,
  ) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    try {
      if (public_id) {
        await this.cloudinaryService.deleteFile(public_id);
      }

      const uploadResult = await this.cloudinaryService.uploadFile(file);

      return this.natsClient.send(
        { cmd: 'upload_user_avatar' },
        {
          headers: requestHeaders,
          data: {
            body,
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
          },
        },
      );
    } catch (error) {
      throw new BadRequestException(
        'Error updating user avatar. Please try again.',
        error,
      );
    }
  }

  @Get()
  fetchAllUsers() {
    return this.natsClient.send({ cmd: 'fetch_all_users' }, {});
  }
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() data: any) {
    const updateObj = {
      params: { id },
      body: data,
    };
    return this.natsClient.send({ cmd: 'update_user' }, updateObj);
  }

  @Delete(':id/delete')
  deleteUser(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }
    return this.natsClient.send(
      { cmd: 'delete_user' },
      { headers: requestHeaders, params: { id } },
    );
  }

  @Post('follow/:id')
  async followOrUnfollowUser(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }
    return this.natsClient.send(
      { cmd: 'follow_or_unfollow' },
      { headers: requestHeaders, params: { id } },
    );
  }

  @Get('profile')
  async getUserProfile(@Request() request: any) {
    const requestHeaders = request.headers;
    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'get_user_profile' },
      { headers: requestHeaders },
    );
  }

  @Post('report/:userId')
  async reportUser(
    @Request() request: any,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'report_user' },
      { headers: requestHeaders, params: { userId }, body },
    );
  }
}
