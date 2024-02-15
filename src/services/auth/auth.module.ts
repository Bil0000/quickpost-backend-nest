import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './user.entity';
import { UsersRepository } from './users.repository';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { OtpService } from './otp.service';
import { EmailService } from 'src/services/email/email.service';
import { Followers } from '../followers/follower.entity';
import { Posts } from '../post/post.entity';
import { Likes } from '../likes/like.entity';
import { mutedusers } from '../mutedusers/mutedusers.entity';
import { Block } from '../blocks/block.entity';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      UsersRepository,
      Followers,
      Posts,
      Likes,
      mutedusers,
      Block,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: 'topSecret51',
      signOptions: {
        expiresIn: 3600,
      },
    }),
    MulterModule.register({
      dest: './uploads/profiles',
    }),
  ],
  providers: [AuthService, JwtStrategy, OtpService, EmailService],
  controllers: [AuthController],
  exports: [JwtStrategy, PassportModule, TypeOrmModule.forFeature([Users])],
})
export class AuthModule {}
