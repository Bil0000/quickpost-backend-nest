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
import { In, Like, Not } from 'typeorm';
import { Followers } from '../followers/follower.entity';
import { FollowersRepository } from '../followers/followers.repository';
import { mutedusers } from '../mutedusers/mutedusers.entity';
import { mutedusersRepository } from '../mutedusers/mutedusers.repository';
import { Block } from '../blocks/block.entity';
import { BlocksRepository } from '../blocks/blocks.repository';
import { SeenPosts } from '../seenposts/seenposts.entity';
import { seenPostsRepository } from '../seenposts/seenposts.repository';
import { PostsGateway } from './posts.gateway';

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
    private postsGateway: PostsGateway,
  ) {}

  async createPost(
    createPostDto: CreatePostDto,
    imageUrl: string,
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

    // Assuming you have the post entity related to the user entity to get the post owner's ID
    // Retrieve the post owner's details if needed (e.g., for getting the FCM token later on)
    const postOwner = await this.usersRepository.findOne({
      where: { id: post.userId },
    });
    if (!postOwner) {
      throw new NotFoundException('Post owner not found');
    }

    if (post) {
      post.likeCount += 1;
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

  // Assuming you want to format numbers for display
  private formatNumber(number: number): string {
    // Example implementation - you can customize this as needed
    return new Intl.NumberFormat().format(number);
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
        await this.postsRepository.save(post);
      }
    }
  }

  async getAllPosts(requesterId: string): Promise<any[]> {
    // Change return type to any[] to include custom properties
    // Handle blocks and mutes
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

    const excludedUserIds = [...new Set([...blockUserIds, ...muteUserIds])];

    // Exclude seen posts
    const seenPosts = await this.seenPostsRepository.find({
      where: { userId: requesterId },
    });
    const seenPostIds = seenPosts.map((seen) => seen.postId);

    // Prepare to fetch posts liked by the requester's followings
    const likedPostsByFollowing = await this.getLikedPostsByFollowing(
      requesterId,
      excludedUserIds,
      seenPostIds,
    );

    // Fetch all posts considering blocks, mutes, and privacy
    const posts = await this.postsRepository.find({
      where: {
        userId: Not(In(excludedUserIds)),
        //  id: Not(In(seenPostIds))
      },
      order: { createdat: 'DESC' },
    });

    // Enhance posts with privacy checks and liked status
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

  async getUserPosts(userId: string): Promise<Posts[]> {
    return this.postsRepository.find({
      where: { userId },
      order: { createdat: 'DESC' },
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
      throw new ForbiddenException(
        "You dont't have access to delete this post",
      );
    }

    const result = await this.postsRepository.delete({ id: postId });

    this.postsGateway.emitDeletePost({ id: postId });

    // Check if any record was affected
    if (result.affected === 0) {
      throw new NotFoundException(`Post with ID "${postId}" not found`);
    }
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
