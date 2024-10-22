import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostsRepository } from './posts.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Posts } from './post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Users } from '../auth/user.entity';
import { UsersRepository } from '../auth/users.repository';
import { LikesRepository } from '../likes/likes.repository';
import { Likes } from '../likes/like.entity';
import { EditPostDto } from './dto/edit-post.dto';
import { In, Like, MoreThan, Not } from 'typeorm';
import { Followers } from '../followers/follower.entity';
import { FollowersRepository } from '../followers/followers.repository';
import { mutedusers } from '../mutedusers/mutedusers.entity';
import { mutedusersRepository } from '../mutedusers/mutedusers.repository';
import { Block } from '../blocks/block.entity';
import { BlocksRepository } from '../blocks/blocks.repository';
import { SeenPosts } from '../seenposts/seenposts.entity';
import { seenPostsRepository } from '../seenposts/seenposts.repository';
import { PostsGateway } from './posts.gateway';
import { Comments } from '../comments/comments.entity';
import { CommentsRepository } from '../comments/comments.repository';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Posts) private postsRepository: PostsRepository,
    @InjectRepository(Users) private usersRepository: UsersRepository,
    @InjectRepository(Likes) private likesRepository: LikesRepository,
    @InjectRepository(Followers)
    private followersRepository: FollowersRepository,
    @InjectRepository(mutedusers)
    private mutedUsersRepository: mutedusersRepository,
    @InjectRepository(Block)
    private blocksRepository: BlocksRepository,
    @InjectRepository(SeenPosts)
    private seenPostsRepository: seenPostsRepository,
    @InjectRepository(Comments)
    private commentsRepository: CommentsRepository,
    private postsGateway: PostsGateway,
  ) {}

  async createPost(
    createPostDto: CreatePostDto,
    imageUrl: string,
    videoUrl: string,
    userId: string,
  ): Promise<Posts> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if any mentioned users have allowTagging set to false
    const mentionedUsers = createPostDto.caption.match(/@[a-zA-Z0-9_]+/g);
    if (mentionedUsers) {
      for (const mentionedUser of mentionedUsers) {
        const mentionedUsername = mentionedUser.substr(1); // Remove "@" prefix
        const mentionedUserEntity = await this.usersRepository.findOne({
          where: [
            { username: mentionedUsername },
            { fullname: mentionedUsername },
          ],
        });

        if (mentionedUserEntity && !mentionedUserEntity.allowTagging) {
          throw new ForbiddenException(
            `User @${mentionedUsername} cannot be tagged.`,
          );
        }
      }
    }

    const post = this.postsRepository.create({
      caption: createPostDto.caption,
      imageUrl: imageUrl,
      videoUrl: videoUrl,
      userId: userId,
      username: user.username,
      profileImageUrl: user.profileImageUrl,
      createdat: new Date(),
      likeCount: 0,
      views: 0,
      commentCount: 0,
    });

    await this.postsRepository.save(post);

    this.postsGateway.emitNewPost(post);

    return post;
  }

  async likePost(userId: string, postId: string): Promise<void> {
    // Check if the user has already liked the post
    const existingLike = await this.likesRepository.findOne({
      where: { userId, postId },
    });

    // If a like exists, do not add another one and optionally inform the user
    if (existingLike) {
      throw new ForbiddenException('You have already liked this post.');
    }

    const like = new Likes();
    like.userId = userId;
    like.postId = postId;
    await this.likesRepository.save(like);

    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Retrieve the liker's username
    const liker = await this.usersRepository.findOne({ where: { id: userId } });
    if (!liker) {
      throw new NotFoundException('Liker not found');
    }

    const postOwner = await this.usersRepository.findOne({
      where: { id: post.userId },
    });
    if (!postOwner) {
      throw new NotFoundException('Post owner not found');
    }

    if (post) {
      post.likeCount += 1;
      post.engagementScore = this.calculateEngagementScore(
        post.views,
        post.likeCount,
      );
      await this.postsRepository.save(post);
      this.postsGateway.emitPostLiked({
        postId: post.id,
        likeCount: post.likeCount,
        likerUserId: userId,
        likerUsername: liker.username,
        postOwnerId: post.userId, // or postOwner.id if you need to ensure it's the same
      });
    }
  }

  private formatNumber(number: number): string {
    return new Intl.NumberFormat().format(number);
  }

  private calculateEngagementScore(views: number, likes: number): number {
    // Define a formula for calculating engagement score based on views and likes
    return views + likes * 2; // Example: views plus double the likes
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    const like = await this.likesRepository.findOne({
      where: { userId, postId },
    });

    if (!like) {
      return;
    }

    if (like) {
      await this.likesRepository.remove(like);

      const post = await this.postsRepository.findOne({
        where: { id: postId },
      });
      if (post) {
        post.likeCount = Math.max(0, post.likeCount - 1);
        await this.postsRepository.save(post);
        this.postsGateway.emitPostUnliked({
          postId: post.id,
          likeCount: post.likeCount,
        });
      }
    }
  }

  // async getLikedPostsByFollowing(requesterId: string): Promise<Posts[]> {
  //   const following = await this.followersRepository.find({
  //     where: { followerId: requesterId },
  //   });
  //   let likedPosts = [];
  //   for (const follow of following) {
  //     const likes = await this.likesRepository.find({
  //       where: { userId: follow.followingId },
  //     });
  //     for (const like of likes) {
  //       const post = await this.postsRepository.findOne({
  //         where: { id: like.postId },
  //       });
  //       if (post) likedPosts.push(post);
  //     }
  //   }
  //   // Remove duplicates
  //   likedPosts = likedPosts.filter(
  //     (value, index, self) =>
  //       index === self.findIndex((t) => t.id === value.id),
  //   );
  //   // Sort by creation date or another criterion
  //   likedPosts.sort((a, b) => (a.createdat > b.createdat ? -1 : 1));
  //   return likedPosts;
  // }

  async markPostAsSeen(userId: string, postId: string): Promise<void> {
    // Check if there's an existing seen post record for this user and post
    const existingSeenPost = await this.seenPostsRepository.findOne({
      where: { userId, postId },
    });

    if (existingSeenPost) {
      // If the record exists, update its 'seenAt' timestamp to the current time
      existingSeenPost.seenAt = new Date();
      await this.seenPostsRepository.save(existingSeenPost);
    } else {
      // If no record exists, create a new seen post record and increment view count
      const newSeenPost = this.seenPostsRepository.create({
        userId,
        postId,
        seenAt: new Date(),
      });
      await this.seenPostsRepository.save(newSeenPost);

      // Find the post and increment views
      const post = await this.postsRepository.findOne({
        where: { id: postId },
      });
      if (post) {
        post.views += 1;
        post.engagementScore = this.calculateEngagementScore(
          post.views,
          post.likeCount,
        );
        await this.postsRepository.save(post);
      }
    }
  }

  async getAllPosts(
    requesterId: string,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    const excludedUserIds = await this.getExcludedUserIds(requesterId);
    const seenPostIds = await this.getSeenPostIds(requesterId);

    // Fetch posts that are not from excluded users and sort by engagementScore
    let posts = await this.postsRepository.find({
      where: {
        userId: Not(In(excludedUserIds)),
      },
      order: {
        engagementScore: 'DESC', // Sort by engagement score
        createdat: 'DESC', // Secondary sorting by creation date
      },
      skip: offset,
      take: limit,
    });

    // Check if additional logic for seen/unseen posts is needed based on your use case
    if (posts.length < limit) {
      const additionalPostsNeeded = limit - posts.length;
      const seenPosts = await this.postsRepository.find({
        where: {
          userId: Not(In(excludedUserIds)),
          id: In(seenPostIds),
        },
        order: {
          engagementScore: 'DESC',
          createdat: 'DESC',
        },
        take: additionalPostsNeeded,
      });
      posts = [...posts, ...seenPosts];
    }

    // Enrich posts with additional data such as whether the current user has liked them
    const enhancedPosts = await this.enrichPosts(posts, requesterId);
    return enhancedPosts;
  }

  private async getExcludedUserIds(requesterId: string): Promise<string[]> {
    const blocks = await this.blocksRepository.find({
      where: [{ blockerId: requesterId }, { blockedId: requesterId }],
    });
    const blockUserIds = blocks.flatMap((block) =>
      [block.blockerId, block.blockedId].filter((id) => id !== requesterId),
    );
    const mutes = await this.mutedUsersRepository.find({
      where: { muterId: requesterId },
    });
    const muteUserIds = mutes.map((mute) => mute.mutedId);
    return [...new Set([...blockUserIds, ...muteUserIds])];
  }

  private async getSeenPostIds(requesterId: string): Promise<string[]> {
    const seenPosts = await this.seenPostsRepository.find({
      where: { userId: requesterId },
    });
    return seenPosts.map((seen) => seen.postId);
  }

  private async enrichPosts(
    posts: Posts[],
    requesterId: string,
  ): Promise<any[]> {
    return Promise.all(
      posts.map(async (post) => {
        const isLikedByCurrentUser = Boolean(
          await this.likesRepository.findOne({
            where: { userId: requesterId, postId: post.id },
          }),
        );
        return { ...post, isLikedByCurrentUser };
      }),
    );
  }

  async getFollowingPosts(
    requesterId: string,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    // Fetch list of user IDs that the requester is following
    const following = await this.followersRepository.find({
      where: { followerId: requesterId },
    });
    const followingIds = following.map((f) => f.followingId);

    // Combine with blocked and muted user checks as previously implemented
    const blocks = await this.blocksRepository.find({
      where: [{ blockerId: requesterId }, { blockedId: requesterId }],
    });
    const blockUserIds = blocks.flatMap((block) =>
      [block.blockerId, block.blockedId].filter((id) => id !== requesterId),
    );

    const mutes = await this.mutedUsersRepository.find({
      where: { muterId: requesterId },
    });
    const muteUserIds = mutes.map((mute) => mute.mutedId);

    // Exclude blocked and muted users from the following list
    const excludedUserIds = [...new Set([...blockUserIds, ...muteUserIds])];
    const eligibleFollowingIds = followingIds.filter(
      (id) => !excludedUserIds.includes(id),
    );

    const seenPosts = await this.seenPostsRepository.find({
      where: { userId: requesterId },
    });
    const seenPostIds = seenPosts.map((seen) => seen.postId);

    const likedPostsByFollowing = await this.getLikedPostsByFollowing(
      requesterId,
      excludedUserIds,
      seenPostIds,
    );

    // Fetch posts from users that the requester is following, excluding blocked/muted users
    const posts = await this.postsRepository.find({
      where: {
        userId: In(eligibleFollowingIds),
      },
      order: { createdat: 'DESC' },
      skip: offset,
      take: limit,
    });

    const enhancedPosts = await Promise.all(
      posts.map(async (post) => {
        const isPrivate = (
          await this.usersRepository.findOne({ where: { id: post.userId } })
        ).isPrivate;
        const isFollower = await this.followersRepository.findOne({
          where: { followerId: requesterId, followingId: post.userId },
        });
        if (isPrivate && !isFollower && post.userId !== requesterId) {
          return null; // Exclude private posts from non-followed users
        }

        // Check if the post is liked by the current user
        // const like = await this.likesRepository.findOne({
        //   where: { userId: requesterId, postId: post.id },
        // });
        const isLikedByCurrentUser =
          (await this.likesRepository.findOne({
            where: { userId: requesterId, postId: post.id },
          })) != null;

        return { ...post, isLikedByCurrentUser };
      }),
    );

    // Filter out null values (private posts from non-followed users)
    const filteredEnhancedPosts = enhancedPosts.filter((post) => post !== null);

    const userLikes = await this.likesRepository.find({
      where: { userId: requesterId },
    });
    const likedPostIds = new Set(userLikes.map((like) => like.postId));

    // Deduplicate posts by combining likedPostsByFollowing and general posts, prioritizing liked posts
    const postIdsSet = new Set(likedPostsByFollowing.map((post) => post.id));
    const combinedPosts = [
      ...likedPostsByFollowing.map((post) => ({
        ...post,
        isLikedByCurrentUser: likedPostIds.has(post.id),
      })),
      ...filteredEnhancedPosts
        .filter((post) => !postIdsSet.has(post.id))
        .map((post) => ({
          ...post,
          isLikedByCurrentUser: likedPostIds.has(post.id),
        })),
    ];

    return combinedPosts;
  }

  async getLikedPostsByFollowing(
    requesterId: string,
    excludedUserIds: string[],
    excludedPostIds: string[],
  ): Promise<Posts[]> {
    const following = await this.followersRepository.find({
      select: ['followingId'],
      where: { followerId: requesterId },
    });
    const followingIds = following.map((follow) => follow.followingId);

    let likedPosts = [];
    for (const userId of followingIds) {
      const likes = await this.likesRepository.find({
        where: { userId },
      });
      for (const like of likes) {
        if (!excludedPostIds.includes(like.postId)) {
          // Check if post is not excluded
          const post = await this.postsRepository.findOne({
            where: { id: like.postId },
          });
          if (post && !excludedUserIds.includes(post.userId)) {
            likedPosts.push(post);
          }
        }
      }
    }

    // Remove duplicates
    likedPosts = likedPosts.filter(
      (value, index, self) =>
        self.findIndex((t) => t.id === value.id) === index,
    );
    return likedPosts;
  }

  async countPostsByUserId(userId: string): Promise<number> {
    return await this.postsRepository.count({
      where: { userId },
    });
  }

  async getUserPosts(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Posts[]> {
    return this.postsRepository.find({
      where: { userId },
      order: { createdat: 'DESC' },
      skip: offset,
      take: limit,
    });
  }

  async deletePost(postId: string, user: Users): Promise<void> {
    const post = await this.postsRepository.findOne({ where: { id: postId } });

    // Check if the post exists
    if (!post) {
      throw new NotFoundException(`Post not found`);
    }

    // Check if the user ID matches the post's user ID
    if (post.userId !== user.id) {
      throw new ForbiddenException("You don't have access to delete this post");
    }

    // Delete likes related to the post
    await this.likesRepository.delete({ postId: post.id });

    // Delete seen posts (views) related to the post
    await this.seenPostsRepository.delete({ postId: post.id });

    // Delete comments related to the post
    await this.deleteCommentsByPostId(post.id);

    // Finally, delete the post itself
    const result = await this.postsRepository.delete({ id: postId });
    this.postsGateway.emitDeletePost({ id: postId });

    // Check if any record was affected
    if (result.affected === 0) {
      throw new NotFoundException(`Post with ID "${postId}" not found`);
    }
  }

  async deleteCommentsByPostId(postId: string): Promise<void> {
    const comments = await this.commentsRepository.find({
      where: { postId: postId },
    });
    for (const comment of comments) {
      await this.recursiveDeleteComment(comment.id);
    }
  }

  async recursiveDeleteComment(commentId: string): Promise<void> {
    const replies = await this.commentsRepository.find({
      where: { parentComment: { id: commentId } },
    });

    for (const reply of replies) {
      await this.recursiveDeleteComment(reply.id);
    }

    await this.commentsRepository.delete({ id: commentId });
  }

  async editPost(
    postId: string,
    userId: string,
    editPostDto: EditPostDto,
  ): Promise<Posts> {
    const post = await this.postsRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to edit this post',
      );
    }

    // Check if any mentioned users have allowTagging set to false
    const mentionedUsers = editPostDto.caption.match(/@[a-zA-Z0-9_]+/g);
    if (mentionedUsers) {
      for (const mentionedUser of mentionedUsers) {
        const mentionedUsername = mentionedUser.substr(1); // Remove "@" prefix
        const mentionedUserEntity = await this.usersRepository.findOne({
          where: [
            { username: mentionedUsername },
            { fullname: mentionedUsername },
          ],
        });

        if (mentionedUserEntity && !mentionedUserEntity.allowTagging) {
          throw new ForbiddenException(
            `User @${mentionedUsername} cannot be tagged.`,
          );
        }
      }
    }

    // Update the post with new values
    post.caption = editPostDto.caption;
    // Add more fields to be updated as necessary

    await this.postsRepository.save(post);

    this.postsGateway.emitUpdatePost(post);

    return post;
  }

  async getHashtagPost(hashTag: string): Promise<Posts[]> {
    return await this.postsRepository.find({
      where: { caption: Like(`%#${hashTag}%`) },
    });
  }

  async getOnePost(id: string): Promise<Posts> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" not found`);
    }
    return post;
  }
}
