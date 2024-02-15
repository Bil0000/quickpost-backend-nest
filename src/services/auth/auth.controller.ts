import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthCredentialsDto } from './dto/register-auth-credentials.dto';
import { LoginAuthCredentialsDto } from './dto/login-auth-credentials.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GetUser } from './get-user.decorator';
import { Users } from './user.entity';
import { AuthGuard } from '@nestjs/passport';
import { FollowerDto } from './dto/follower.dto';
import { FollowingDto } from './dto/following.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { extname } from 'path';
import { diskStorage } from 'multer';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async signUp(
    @Body() registerAuthCredentialsDto: RegisterAuthCredentialsDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    const profileImagePath = file
      ? `http://localhost:3000/uploads/profiles/${file.filename}`
      : null;
    return this.authService.signUp(
      registerAuthCredentialsDto,
      profileImagePath,
    );
  }

  @Post('/signin')
  async signIn(
    @Body() loginAuthCredentialsDto: LoginAuthCredentialsDto,
  ): Promise<{
    refresh_token?: string;
    access_token?: string;
    status?: number;
    message?: string;
  }> {
    return this.authService.signIn(loginAuthCredentialsDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/logout-all')
  async logoutAll(@Request() req): Promise<{ message: string }> {
    await this.authService.logoutFromAllDevices(req.user.id);
    return { message: 'Successfully logged out from all devices.' };
  }

  @Post('/verify')
  // set custom http resonse code instead of default code for post method
  @HttpCode(200)
  validateOtp(@Body() body: { email: string; otp: string }): Promise<object> {
    return this.authService.validateOtp(body.email, body.otp);
  }

  @Post('/resend-otp')
  resendOtp(@Body('email') email: string): Promise<void> {
    return this.authService.resendOtp(email);
  }

  @Post('/forgot-password')
  forgotPassword(@Body('email') email: string): Promise<void> {
    return this.authService.forgotPassword(email);
  }

  @Post('/reset-password')
  @HttpCode(200)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('/get-email-by-username/:username')
  async getEmailByUsername(
    @Param('username') username: string,
  ): Promise<{ email: string }> {
    // Implement the logic to retrieve the email associated with the provided username
    const email = await this.authService.getEmailByUsername(username);
    return { email };
  }

  @Get('/get-user-id/:username')
  async getUserIdFromUsername(
    @Param('username') username: string,
  ): Promise<{ id: string }> {
    // Implement the logic to retrieve the email associated with the provided username
    const id = await this.authService.getUserIdFromUsername(username);
    return { id };
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<Users> {
    return this.authService.getUserById(id);
  }

  @UseGuards(AuthGuard())
  @Post('/:followingId/follow')
  @HttpCode(200)
  async followUser(
    @GetUser() user: Users,
    @Param('followingId') followingId: string,
  ) {
    await this.authService.followUser(user.id, followingId);
    return { message: 'Followed successfully' };
  }

  @UseGuards(AuthGuard())
  @Post('/:followingId/unfollow')
  @HttpCode(200)
  async unfollowUser(
    @GetUser() user: Users,
    @Param('followingId') followingId: string,
  ) {
    await this.authService.unfollowUser(user.id, followingId);
    return { message: 'Unfollowed successfully' };
  }

  @Get('/profile/:id')
  @UseGuards(AuthGuard())
  async getUserProfile(@Param('id') id: string): Promise<Users> {
    return this.authService.getUserProfile(id);
  }

  @Get('/isFollowing/:followingId')
  @UseGuards(AuthGuard('jwt'))
  async checkIfUserIsFollowing(
    @GetUser() user: Users,
    @Param('followingId') followingId: string,
  ): Promise<{ isFollowing: boolean }> {
    const isFollowing = await this.authService.isUserFollowing(
      user.id,
      followingId,
    );
    return { isFollowing };
  }

  @Get(':id/followers')
  async getFollowers(@Param('id') userId: string): Promise<FollowerDto[]> {
    return this.authService.getFollowers(userId);
  }

  @Get(':id/following')
  async getFollowing(@Param('id') userId: string): Promise<FollowingDto[]> {
    return this.authService.getFollowing(userId);
  }

  @Get('/validate-username/:username')
  async isUsernameValid(
    @Param('username') username: string,
  ): Promise<{ isValid: boolean }> {
    const isValid = await this.authService.validateUsername(username);
    return { isValid };
  }

  @Patch('/profile/update')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profileImage', maxCount: 1 },
        { name: 'bannerImage', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/profiles',
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
      },
    ),
  )
  async updateProfile(
    @GetUser() user: Users,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File[];
      bannerImage?: Express.Multer.File[];
    },
  ): Promise<{ message: string }> {
    const profileImageUrl = files.profileImage?.[0]
      ? `http://localhost:3000/uploads/profiles/${files.profileImage[0].filename}`
      : undefined;
    const bannerImageUrl = files.bannerImage?.[0]
      ? `http://localhost:3000/uploads/profiles/${files.bannerImage[0].filename}`
      : undefined;

    return this.authService.updateProfile(
      user.id,
      updateProfileDto,
      profileImageUrl,
      bannerImageUrl,
    );
  }

  // @Patch('/profile/update')
  // @UseGuards(AuthGuard('jwt'))
  // @UseInterceptors(
  //   FileInterceptor('profileImage', {
  //     storage: diskStorage({
  //       destination: './uploads/profiles',
  //       filename: (req, file, cb) => {
  //         const randomName = Array(32)
  //           .fill(null)
  //           .map(() => Math.round(Math.random() * 16).toString(16))
  //           .join('');
  //         cb(null, `${randomName}${extname(file.originalname)}`);
  //       },
  //     }),
  //   }),
  // )
  // async updateProfile(
  //   @GetUser() user: Users,
  //   @Body() updateProfileDto: UpdateProfileDto,
  //   @UploadedFile() file: Express.Multer.File,
  // ): Promise<{ message: string }> {
  //   let profileImagePath = null;
  //   if (file) {
  //     profileImagePath = `http://localhost:3000/uploads/profiles/${file.filename}`;
  //   }

  //   // Update the return type here
  //   return this.authService.updateProfile(
  //     user.id,
  //     updateProfileDto,
  //     profileImagePath,
  //   );
  // }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/profile/delete')
  async deleteAccount(@GetUser() user: Users): Promise<{ message: string }> {
    await this.authService.deleteUserById(user.id);
    return { message: 'Account deleted successfully.' };
  }

  @Patch(':id/privacy')
  @UseGuards(AuthGuard())
  async updatePrivacySetting(
    @Param('id') userId: string,
    @Body('isPrivate') isPrivate: boolean,
    @Body('isTagging') isTagging: boolean,
    @GetUser() user: Users,
  ): Promise<void> {
    if (userId !== user.id) {
      throw new ForbiddenException(
        'You can only update your own privacy settings.',
      );
    }
    return this.authService.updatePrivacySetting(userId, isPrivate, isTagging);
  }

  @Get(':id/privacy')
  @UseGuards(AuthGuard())
  async getPrivacySetting(
    @Param('id') userId: string,
  ): Promise<{ isPrivate: boolean; isTagging: boolean }> {
    const userPrivacySettings =
      await this.authService.getPrivacySetting(userId);
    return {
      isPrivate: userPrivacySettings.isPrivate,
      isTagging: userPrivacySettings.isTagging,
    };
  }

  @UseGuards(AuthGuard())
  @Post('/mute/:mutedId')
  async muteUser(@Param('mutedId') mutedId: string, @GetUser() user: Users) {
    return this.authService.muteUser(user.id, mutedId);
  }

  @UseGuards(AuthGuard())
  @Post('/unmute/:mutedId')
  async unmuteUser(@Param('mutedId') mutedId: string, @GetUser() user: Users) {
    return this.authService.unmuteUser(user.id, mutedId);
  }

  // @Get('/users')
  // @UseGuards(AuthGuard())
  // async getMutedUsers(@GetUser() user: Users): Promise<Users[]> {
  //   return this.authService.getMutedUsers(user.id);
  // }

  @UseGuards(AuthGuard())
  @Get('/muted/users')
  async getMutedUsers(@GetUser() user: Users): Promise<Users[]> {
    return this.authService.getMutedUsers(user.id);
  }

  @UseGuards(AuthGuard())
  @Get('/isMuted/:mutedId')
  async checkIfUserIsMuted(
    @GetUser() user: Users,
    @Param('mutedId') mutedId: string,
  ): Promise<{ isMuted: boolean }> {
    const isMuted = await this.authService.isUserMuted(user.id, mutedId);
    return { isMuted };
  }

  @UseGuards(AuthGuard())
  @Post('/block/:blockedId')
  async blockUser(
    @Param('blockedId') blockedId: string,
    @GetUser() user: Users,
  ) {
    return this.authService.blockUser(user.id, blockedId);
  }

  @UseGuards(AuthGuard())
  @Post('/unblock/:blockedId')
  async unblockUser(
    @Param('blockedId') blockedId: string,
    @GetUser() user: Users,
  ) {
    return this.authService.unblockUser(user.id, blockedId);
  }

  @UseGuards(AuthGuard())
  @Get('/isBlocked/:blockedId')
  async isUserBlocked(
    @Param('blockedId') blockedId: string,
    @GetUser() user: Users,
  ): Promise<{ isBlocked: boolean }> {
    const isBlocked = await this.authService.isUserBlocked(user.id, blockedId);
    return { isBlocked };
  }

  @Get('/blocked/users')
  @UseGuards(AuthGuard())
  async getBlockedUsers(@GetUser() user: Users): Promise<Users[]> {
    return this.authService.getBlockedUsers(user.id);
  }
}
