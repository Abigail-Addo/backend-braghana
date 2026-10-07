import {
  BadRequestException,
  Controller,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { Auth } from 'src/iam/authentication/decorator/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { PrismaService } from 'src/prisma/prisma.service';

enum ReactionType {
  Like = 'Like',
  Love = 'Love',
  Haha = 'Haha',
  Wow = 'Wow',
  Sad = 'Sad',
  Angry = 'Angry',
}

@Controller()
export class PostsMicroserviceController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'create_post' })
  async createPost(@Payload() request: any) {
    const userId = request.user.sub;

    const { content, url, public_id } = request.data;

    if (url !== null && url !== '' && url !== undefined) {
      const post = await this.prisma.post.create({
        data: {
          content: content,
          userId: userId,
          mediaUrl: url,
          public_id: public_id,
        },
      });

      return post;
    }

    const post = await this.prisma.post.create({
      data: {
        content: content,
        userId: userId,
      },
    });

    return post;
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_timeline_posts' })
  async getTimelinePosts() {
    const posts = await this.prisma.post.findMany({
      include: {
        likes: true,
        comments: {
          include: {
            replies: {
              include: {
                replies: true,
              },
            },
            reactions: true,
          },
        },
        reactions: true,
        reportedPosts: true,
        mutedPosts: true,
        savedPost: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedPosts = posts.map((post) => {
      const formattedComments = post.comments.map((comment) => ({
        ...comment,
        reactionsCount: comment.reactions.length,
      }));

      return {
        ...post,
        viewsCount: post.views,
        reactionsCount: post.reactions.length,
        commentsCount: post.comments.length,
        likesCount: post.likes.length,
        mutedCount: post.mutedPosts.length,
        reportedCount: post.reportedPosts.length,
        savedPostsCount: post.savedPost.length,
        comments: formattedComments,
      };
    });

    return formattedPosts.length > 0 ? formattedPosts : [];
  }

  @MessagePattern({ cmd: 'get_all_posts' })
  async getPosts(@Payload() request: any) {
    const userId = request.user.sub;

    try {
      const mutedPostIds = await this.prisma.mutedPost.findMany({
        where: { userId },
        select: { postId: true },
      });

      const reportedPostIds = await this.prisma.reportedPost.findMany({
        where: { userId },
        select: { postId: true },
      });

      const excludedPostIds = [
        ...mutedPostIds.map((mp) => mp.postId),
        ...reportedPostIds.map((rp) => rp.postId),
      ];

      const posts = await this.prisma.post.findMany({
        where: {
          NOT: { postId: { in: excludedPostIds } },
        },
        include: {
          likes: true,
          comments: {
            include: {
              replies: {
                include: {
                  replies: true,
                },
              },
            },
          },
          reactions: true,
          reportedPosts: true,
          mutedPosts: true,
          savedPost: true,
        },
      });

      if (posts.length === 0) {
        return { message: 'No posts found', data: [] };
      }

      return posts;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw new Error('Failed to fetch posts.');
    }
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_a_post' })
  async getPostById(@Payload() request: any) {
    const postId = request.params.id;

    const post = await this.prisma.post.findUnique({
      where: {
        postId: postId,
      },
      include: {
        likes: true,
        comments: true,
        reactions: true,
        reportedPosts: true,
        mutedPosts: true,
      },
    });

    if (!post) {
      return { message: 'Post not found', data: {} };
    }

    await this.prisma.post.update({
      where: { postId },
      data: { views: { increment: 1 } },
    });
    return post;
  }

  @MessagePattern({ cmd: 'get_user_posts' })
  async getUserPosts(@Payload() request: any) {
    const userId = request.user.sub;
    const posts = await this.prisma.post.findMany({
      where: { userId },
      include: {
        mutedPosts: true,
        reportedPosts: true,
        reactions: true,
        comments: true,
        likes: true,
        savedPost: true,
      },
    });

    const formattedPosts = posts.map((post) => ({
      postId: post.postId,
      content: post.content,
      viewsCount: post.views,
      reactionsCount: post.reactions.length,
      likesCount: post.likes.length,
      savedCount: post.savedPost.length,
      mutedCount: post.mutedPosts.length,
      reportedCount: post.reportedPosts.length,
      commentsCount: post.comments.length,
    }));

    return {
      message: 'Posts fetched successfully',
      data: {
        count: formattedPosts.length,
        posts: formattedPosts,
      },
    };
  }

  @MessagePattern({ cmd: 'update_post' })
  async updatePost(@Payload() request: any) {
    const postId = request.params.id;
    const userId = request.user.sub;
    const post = await this.prisma.post.findUnique({
      where: {
        postId,
        userId,
      },
    });

    if (!post) {
      return { message: 'Post not found', data: {} };
    }

    if (post.userId !== userId) {
      throw new Error('Unauthorized. you cannot update this post');
    }

    const updatedPost = await this.prisma.post.update({
      where: {
        postId,
        userId,
      },
      data: {
        content: request.data.content,
        updatedAt: new Date(),
      },
    });
    return updatedPost;
  }

  @MessagePattern({ cmd: 'delete_post' })
  async deletePost(@Payload() request: any) {
    const userId = request.user.sub;
    const postId = request.params.id;
    const post = await this.prisma.post.findUnique({
      where: {
        postId,
        userId,
      },
    });
    if (!post) {
      return { message: 'Post not found', data: {} };
    }

    if (post.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized. you cannot delete x this post');
    }
    await this.prisma.post.delete({
      where: {
        postId,
        userId,
      },
    });
    return { message: 'Post deleted successfully' };
  }

  @MessagePattern({ cmd: 'mute_or_unmute_post' })
  async muteOrUnmutePost(@Payload() request: any) {
    try {
      const { mutedUntil } = request.data;
      const userId = request.user?.sub;
      const postId = request.params?.id;

      if (!userId || !postId) {
        throw new Error('Invalid user ID or post ID.');
      }

      const existingMute = await this.prisma.mutedPost.findFirst({
        where: { userId, postId },
      });

      if (!mutedUntil) {
        if (!existingMute) {
          return { message: 'Post is not currently muted.' };
        }

        await this.prisma.mutedPost.delete({
          where: { muteId: existingMute.muteId },
        });

        return { message: 'Post has been unmuted.' };
      }

      if (existingMute) {
        await this.prisma.mutedPost.update({
          where: { muteId: existingMute.muteId },
          data: { mutedUntil },
        });

        return { message: 'Post mute duration has been updated.' };
      }

      await this.prisma.mutedPost.create({
        data: { userId, postId, mutedUntil },
      });

      return { message: 'Post has been muted.' };
    } catch (error) {
      return { error: error.message || 'Failed to mute or unmute the post.' };
    }
  }

  @MessagePattern({ cmd: 'comment_on_post' })
  async commentOnPost(@Payload() request: any) {
    const userId = request.user.sub;
    const postId = request.params.id;
    const content = request.data.content;

    const comment = await this.prisma.comment.create({
      data: {
        content: content,
        userId: userId,
        postId: postId,
      },
      include: {
        post: true,
      },
    });

    this.natsClient.emit(
      { cmd: 'comment_notification' },
      {
        type: 'comment',
        message: 'Comment made on your post',
        userId: comment.post.userId,
        postId: postId,
        actorId: userId,
      },
    );
    return comment;
  }

  @MessagePattern({ cmd: 'comment_on_comment' })
  async commentOnComment(@Payload() request: any) {
    const userId = request.user.sub;
    const parentId = request.params.commentId;
    const content = request.data.content;

    try {
      const parentComment = await this.prisma.comment.findUnique({
        where: { commentId: parentId },
      });
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      const comment = await this.prisma.comment.create({
        data: {
          content,
          userId,
          parentId,
        },
      });

      return comment;
    } catch (error) {
      const errorMessage = error.message || 'Failed to comment on comment';
      return { error: errorMessage };
    }
  }

  @MessagePattern({ cmd: 'delete_comment' })
  async deleteComment(@Payload() request: any) {
    const userId = request.user.sub;
    const commentId = request.params.commentId;

    const comment = await this.prisma.comment.findUnique({
      where: { commentId },
      include: { replies: true, post: true },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    const isCommentOwner = comment.userId === userId;
    const isPostOwner = comment.post?.userId === userId;

    if (!isCommentOwner && !isPostOwner) {
      throw new Error('You do not have permission to delete this comment');
    }

    const deleteRepliesRecursively = async (commentId: string) => {
      const replies = await this.prisma.comment.findMany({
        where: { parentId: commentId },
      });

      for (const reply of replies) {
        await deleteRepliesRecursively(reply.commentId);
      }

      await this.prisma.comment.delete({
        where: { commentId },
      });
    };

    await deleteRepliesRecursively(commentId);

    return { message: 'Comment and its replies deleted successfully' };
  }

  @MessagePattern({ cmd: 'report_post' })
  async reportPost(@Payload() request: any) {
    const userId = request.user.sub;
    const postId = request.params.id;

    const post = await this.prisma.post.findUnique({
      where: { postId },
    });
    if (!post) {
      return { message: 'Post not found.', data: {} };
    }

    const existingReport = await this.prisma.reportedPost.findFirst({
      where: { userId, postId },
    });
    if (existingReport) {
      return { message: 'Post is already reported by this user.' };
    }

    const report = await this.prisma.reportedPost.create({
      data: {
        userId,
        postId,
        reason: request.data.reason,
      },
    });
    await this.prisma.post.update({
      where: { postId },
      data: { views: { increment: 1 } },
    });
    return report;
  }

  @MessagePattern({ cmd: 'like_or_unlike_post' })
  async likeUnlikePost(@Payload() request: any) {
    const userId = request.user.sub;
    const postId = request.params.id;
    const existingLike = await this.prisma.likePost.findFirst({
      where: { userId, postId },
      include: { post: true },
    });

    if (existingLike) {
      await this.prisma.likePost.delete({
        where: { likeId: existingLike.likeId },
      });

      await this.prisma.post.update({
        where: { postId },
        data: { views: { increment: 1 } },
      });

      return { message: 'Post has been unliked.' };
    } else {
      const likedPost = await this.prisma.likePost.create({
        data: { userId, postId },
      });

      await this.prisma.post.update({
        where: { postId },
        data: { views: { increment: 1 } },
      });

      this.natsClient.emit('like_post', {
        userId: likedPost.userId,
        postId: likedPost.postId,
        type: 'like',
        message: 'Post has been liked.',
      });

      return { message: 'Post has been liked.' };
    }
  }

  @MessagePattern({ cmd: 'save_or_unsave_post' })
  async saveOrUnsavePost(@Payload() request: any) {
    try {
      if (
        !request.user ||
        !request.user.sub ||
        !request.params ||
        !request.params.id
      ) {
        throw new Error('Invalid request structure: user or post ID missing.');
      }

      const userId = request.user.sub;
      const postId = request.params.id;

      if (!userId || !postId) {
        throw new Error('Invalid user ID or post ID.');
      }

      const existingSave = await this.prisma.savedPost.findFirst({
        where: { userId, postId },
      });

      if (existingSave) {
        await this.prisma.savedPost.delete({
          where: { saveId: existingSave.saveId },
        });
        return { message: 'Post has been unsaved.' };
      } else {
        await this.prisma.savedPost.create({
          data: { userId: userId, postId: postId },
        });

        await this.prisma.post.update({
          where: { postId: postId },
          data: { views: { increment: 1 } },
        });
        return { message: 'Post has been saved.' };
      }
    } catch (error) {
      console.error('Error processing save/unsave post:', error.message);
      return {
        error:
          error.message ||
          'An error occurred while saving or un-saving the post.',
      };
    }
  }

  @MessagePattern({ cmd: 'get_saved_posts' })
  async getSavedPosts() {
    const savedPosts = await this.prisma.savedPost.findMany({
      include: {
        post: true,
      },
    });
    return savedPosts;
  }

  @MessagePattern({ cmd: 'get_reported_posts' })
  async getReportedPosts() {
    const reportedPosts = await this.prisma.reportedPost.findMany({
      include: {
        post: true,
      },
    });
    return reportedPosts;
  }

  @MessagePattern({ cmd: 'get_muted_posts' })
  async getMutedPosts() {
    const mutedPosts = await this.prisma.mutedPost.findMany({
      include: {
        post: true,
      },
    });
    return mutedPosts;
  }

  @MessagePattern({ cmd: 'react_to_post' })
  async reactToPost(@Payload() request: any) {
    const { reaction } = request.data;
    const userId = request.user?.sub;
    const postId = request.params?.id;

    const existingReaction = await this.prisma.reaction.findFirst({
      where: {
        userId,
        postId,
      },
    });

    if (existingReaction) {
      if (existingReaction.reaction === reaction) {
        await this.prisma.reaction.delete({
          where: { reactionId: existingReaction.reactionId },
        });

        return { message: 'Reaction removed from the post.' };
      } else {
        await this.prisma.reaction.update({
          where: { reactionId: existingReaction.reactionId },
          data: { reaction },
        });

        return { message: 'Reaction updated successfully.' };
      }
    } else {
      await this.prisma.reaction.create({
        data: {
          userId,
          postId,
          reaction,
        },
      });

      return { message: 'Reaction added successfully.' };
    }
  }

  @MessagePattern({ cmd: 'like_or_unlike_comment' })
  async likeComment(@Payload() request: any) {
    const { commentId } = request.params;
    const userId = request.user.sub;

    if (!userId || !commentId) {
      throw new BadRequestException('Please login to like a comment.');
    }

    try {
      const existingLike = await this.prisma.reaction.findFirst({
        where: {
          userId: userId,
          commentId: commentId,
          reaction: ReactionType.Like,
        },
      });

      if (existingLike) {
        await this.prisma.reaction.deleteMany({
          where: {
            userId: userId,
            commentId: commentId,
            reaction: ReactionType.Like,
          },
        });
        return { message: 'Unliked the comment' };
      } else {
        await this.prisma.reaction.create({
          data: {
            userId: userId,
            commentId: commentId,
            reaction: ReactionType.Like,
          },
        });
        return { message: 'Liked the comment' };
      }
    } catch (error) {
      console.error('Error liking/un-liking comment:', error);
      throw new InternalServerErrorException('Error processing the request');
    }
  }

  @MessagePattern({ cmd: 'react_to_comment' })
  async reactToComment(@Payload() request: any) {
    const reactionType = request.data.reaction;
    const { commentId } = request.params;
    const userId = request.user.sub;

    console.log({ reactionType, commentId, userId });

    if (!userId || !commentId || !reactionType) {
      throw new BadRequestException(
        'User ID, Comment ID, and Reaction Type are required',
      );
    }

    if (!Object.values(ReactionType).includes(reactionType)) {
      throw new BadRequestException('Invalid reaction type');
    }

    try {
      const existingReaction = await this.prisma.reaction.findFirst({
        where: {
          userId: userId,
          commentId: commentId,
          reaction: reactionType,
        },
      });

      if (existingReaction) {
        await this.prisma.reaction.update({
          where: { reactionId: existingReaction.reactionId },
          data: { reactedAt: new Date() },
        });
        return {
          message: `Updated your ${reactionType} reaction on the comment`,
        };
      } else {
        await this.prisma.reaction.create({
          data: {
            userId: userId,
            commentId: commentId,
            reaction: reactionType,
          },
        });
        return { message: `Reacted with ${reactionType} to the comment` };
      }
    } catch (error) {
      console.error('Error reacting to comment:', error);
      throw new InternalServerErrorException('Error processing the request');
    }
  }
}
