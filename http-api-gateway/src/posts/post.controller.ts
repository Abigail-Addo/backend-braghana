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
import { CreatePostDto, ReactionDto } from './dtos/create-post.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Controller('posts')
export class PostController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  // =============== Posts ====================== //

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
        if (file.mimetype.startsWith('image/') && file.size > 1 * 1024 * 1024) {
          return callback(
            new BadRequestException('Images must not exceed 1 MB'),
            false,
          );
        }

        if (
          file.mimetype.startsWith('video/') &&
          file.size > 20 * 1024 * 1024
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
  async createPost(
    @UploadedFile() file: Express.Multer.File,
    @Request() request: any,
    @Body() data: CreatePostDto,
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
        { cmd: 'create_post' },
        { data, headers: requestHeaders },
      );
    }

    const result = await this.cloudinaryService.uploadFile(file);

    return this.natsClient.send(
      { cmd: 'create_post' },
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
  getPosts(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_all_posts' },
      { headers: requestHeaders },
    );
  }

  // get timeline posts
  @Get('timeline')
  getTimelinePosts(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_timeline_posts' },
      { headers: requestHeaders },
    );
  }

  // get all user posts
  @Get('user')
  getUserPosts(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_user_posts' },
      { headers: requestHeaders },
    );
  }

  @Put(':id') //update post
  updatePost(
    @Request() request: any,
    @Body('content') content: string,
    @Param('id') id: string,
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
      { cmd: 'update_post' },
      { headers: requestHeaders, params: { id }, data: { content } },
    );
  }

  @Delete(':id/:imgId?')
  async deletePost(
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
        { cmd: 'delete_post' },
        { headers: requestHeaders, params: { id } },
      );
    }

    return this.natsClient.send(
      { cmd: 'delete_post' },
      { headers: requestHeaders, params: { id } },
    );
  }

  @Get(':id')
  getPostById(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_a_post' },
      { headers: requestHeaders, params: { id } },
    );
  }

  // ================ Comment section ========= //
  // comment on post
  @Post(':id/comment') //comment on post
  commentOnPost(
    @Request() request: any,
    @Body('content') content: string,
    @Param('id') id: string,
  ) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    if (!content) {
      const error = new BadRequestException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    return this.natsClient.send(
      { cmd: 'comment_on_post' },
      { headers: requestHeaders, params: { id }, data: { content } },
    );
  }

  // comment on comment
  @Post('comments/:commentId')
  commentOnComment(
    @Request() request: any,
    @Body('content') content: string,
    @Param('commentId') commentId: string,
  ) {
    const requestHeaders = request.headers;

    return this.natsClient.send(
      { cmd: 'comment_on_comment' },
      { headers: requestHeaders, params: { commentId }, data: { content } },
    );
  }

  // delete a  comment on a comment
  @Delete('comments/:commentId')
  deleteComment(
    @Request() request: any,
    @Param('commentId') commentId: string,
  ) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'delete_comment' },
      { headers: requestHeaders, params: { commentId } },
    );
  }

  // ================= Report section ========= //

  @Post(':id/report') //report post
  reportPost(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'report_post' },
      {
        headers: requestHeaders,
        params: { id },
        data: { reason: request.body.reason },
      },
    );
  }

  // fetch all reports
  @Get('all/reports')
  getReports(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_reported_posts' },
      { headers: requestHeaders },
    );
  }

  // ================= Like section ========= //

  @Post(':id/like') //like post
  likePost(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;

    return this.natsClient.send(
      { cmd: 'like_or_unlike_post' },
      { headers: requestHeaders, params: { id } },
    );
  }

  // like a comment
  @Post('comments/:commentId/like')
  likeComment(@Request() request: any, @Param('commentId') commentId: string) {
    const requestHeaders = request.headers;

    return this.natsClient.send(
      { cmd: 'like_or_unlike_comment' },
      { headers: requestHeaders, params: { commentId } },
    );
  }

  // ================ Save section ========= //
  // save post
  @Post(':id/save') //save post
  saveOrUnsavePost(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;

    return this.natsClient.send(
      { cmd: 'save_or_unsave_post' },
      { headers: requestHeaders, params: { id } },
    );
  }

  // fetch all saved posts
  @Get('all/saved')
  getSavedPosts(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_saved_posts' },
      { headers: requestHeaders },
    );
  }

  // ================ Mute section ========= //

  // get muted posts
  @Get('muted')
  getMutedPosts(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_muted_posts' },
      { headers: requestHeaders },
    );
  }

  @Post(':id/mute')
  muteOrUnmutePost(
    @Request() request: any,
    @Body('mutedUntil') mutedUntil: Date,
    @Param('id') id: string,
  ) {
    const requestHeaders = request.headers;

    return this.natsClient.send(
      { cmd: 'mute_or_unmute_post' },
      { headers: requestHeaders, params: { id }, data: { mutedUntil } },
    );
  }

  // ================= Reactions section - comment and post ========= //

  // react to a post
  @Post(':id/reactions')
  reactToPost(
    @Request() request: any,
    @Body() body: ReactionDto,
    @Param('id') id: string,
  ) {
    const requestHeaders = request.headers;

    return this.natsClient.send(
      { cmd: 'react_to_post' },
      { headers: requestHeaders, params: { id }, data: body },
    );
  }

  // react to a comment
  @Post('comments/:commentId/reactions')
  reactToComment(
    @Request() request: any,
    @Body() body: ReactionDto,
    @Param('commentId') commentId: string,
  ) {
    const requestHeaders = request.headers;

    return this.natsClient.send(
      { cmd: 'react_to_comment' },
      { headers: requestHeaders, params: { commentId }, data: body },
    );
  }
}
