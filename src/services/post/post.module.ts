import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Posts } from './post.entity';
import { PostsRepository } from './posts.repository';
import { PassportModule } from '@nestjs/passport';
import { Users } from '../auth/user.entity';
import { Likes } from '../likes/like.entity';
import { Followers } from '../followers/follower.entity';
import { mutedusers } from '../mutedusers/mutedusers.entity';
import { Block } from '../blocks/block.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SeenPosts } from '../seenposts/seenposts.entity';
import { PostsGateway } from './posts.gateway';
import { Comments } from '../comments/comments.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Posts,
      PostsRepository,
      Users,
      Likes,
      Followers,
      mutedusers,
      Block,
      SeenPosts,
      Comments,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const fileExtName = extname(file.originalname);
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          callback(null, `${randomName}${fileExtName}`);
        },
      }),
    }),
  ],
  providers: [PostService, PostsGateway],
  controllers: [PostController],
})
export class PostModule {}
