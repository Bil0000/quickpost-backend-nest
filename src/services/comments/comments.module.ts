import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comments } from './comments.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { Users } from '../auth/user.entity';
import { Posts } from '../post/post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comments, Users, Posts]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [CommentsService, JwtStrategy],
  controllers: [CommentsController],
})
export class CommentsModule {}
