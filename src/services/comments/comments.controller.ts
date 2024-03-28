import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comments } from './comments.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('/')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @UseGuards(AuthGuard())
  @Post('/comments')
  createComment(
    @Body()
    createCommentDto: {
      postId: string;
      text: string;
      parentCommentId?: string;
    },
    @Req() req,
  ) {
    const { postId, text, parentCommentId } = createCommentDto;
    return this.commentsService.createComment(
      req.user.id,
      postId,
      text,
      parentCommentId,
    );
  }

  @UseGuards(AuthGuard())
  @Delete('/comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req,
  ): Promise<void> {
    return this.commentsService.deleteComment(req.user.id, commentId);
  }

  @UseGuards(AuthGuard())
  @Patch('/comments/:commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Body('text') text: string,
    @Req() req,
  ): Promise<Comments> {
    return this.commentsService.updateComment(req.user.id, commentId, text);
  }

  @UseGuards(AuthGuard())
  @Get('/posts/:postId/comments')
  async getCommentsByPostId(
    @Param('postId') postId: string,
  ): Promise<Comments[]> {
    return this.commentsService.getCommentsByPostId(postId);
  }

  @UseGuards(AuthGuard())
  @Get('/comments/user/:userId')
  async getUserPosts(@Param('userId') userId: string): Promise<Comments[]> {
    return this.commentsService.getUserComments(userId);
  }
}
