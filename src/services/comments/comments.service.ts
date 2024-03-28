import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentsRepository } from './comments.repository';
import { Comments } from './comments.entity';
import { Posts } from '../post/post.entity';
import { PostsRepository } from '../post/posts.repository';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comments) private commentsRepository: CommentsRepository,
    @InjectRepository(Posts) private postsRepository: PostsRepository,
  ) {}

  async createComment(
    userId: string,
    postId: string,
    text: string,
    parentCommentId?: string,
  ): Promise<Comments> {
    const comment = new Comments();
    comment.postId = postId;
    comment.userId = userId;
    comment.text = text;

    if (parentCommentId) {
      const parentComment = await this.commentsRepository.findOne({
        where: { id: parentCommentId },
      });
      comment.parentComment = parentComment || null;
      comment.isReply = true || false;
    }

    this.postsRepository.update(
      { id: postId },
      { commentCount: () => `commentCount + 1` },
    );

    await this.commentsRepository.save(comment);
    return comment;
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found.`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to delete this comment.',
      );
    }

    await this.commentsRepository.remove(comment);

    // Optionally, decrement the post's comment count
    if (comment.postId) {
      this.postsRepository.decrement({ id: comment.postId }, 'commentCount', 1);
    }
  }

  async updateComment(
    userId: string,
    commentId: string,
    text: string,
  ): Promise<Comments> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found.`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to update this comment.',
      );
    }

    comment.text = text;
    await this.commentsRepository.save(comment);
    return comment;
  }

  async getCommentsByPostId(postId: string): Promise<Comments[]> {
    return this.commentsRepository.find({
      where: { postId },
      relations: ['replies'], // Load replies if using nested comments
      order: { createdAt: 'DESC', replies: { createdAt: 'DESC' } },
    });
  }

  async getUserComments(userId: string): Promise<Comments[]> {
    return this.commentsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
