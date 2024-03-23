import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { LoginAuthCredentialsDto } from './dto/login-auth-credentials.dto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './user.entity';
import { JwtPayload } from './jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { RegisterAuthCredentialsDto } from './dto/register-auth-credentials.dto';
import { OtpService } from './otp.service';
import { EmailService } from 'src/services/email/email.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Followers } from '../followers/follower.entity';
import { FollowersRepository } from '../followers/followers.repository';
import { FollowingDto } from './dto/following.dto';
import { FollowerDto } from './dto/follower.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Posts } from '../post/post.entity';
import { PostsRepository } from '../post/posts.repository';
import { Likes } from '../likes/like.entity';
import { LikesRepository } from '../likes/likes.repository';
import { mutedusers } from '../mutedusers/mutedusers.entity';
import { mutedusersRepository } from '../mutedusers/mutedusers.repository';
import { In } from 'typeorm';
import { Block } from '../blocks/block.entity';
import { BlocksRepository } from '../blocks/blocks.repository';
import { PostsGateway } from '../post/posts.gateway';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users) private usersRepository: UsersRepository,
    @InjectRepository(Followers)
    private followersRepository: FollowersRepository,
    @InjectRepository(Posts)
    private postsRepository: PostsRepository,
    @InjectRepository(Likes)
    private likesRepository: LikesRepository,
    @InjectRepository(mutedusers)
    private mutedUsersRepository: mutedusersRepository,
    @InjectRepository(Block)
    private blocksRepository: BlocksRepository,
    private jwtService: JwtService,
    private otpService: OtpService,
    private emailService: EmailService,
    private postsGateway: PostsGateway,
  ) {}

  async signUp(
    registerAuthCredentialsDto: RegisterAuthCredentialsDto,
    profileImagePath: string,
  ): Promise<void> {
    const { email, fullname, bio, username, password } =
      registerAuthCredentialsDto;

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const defaultBannerUrl =
      'https://www.shutterstock.com/image-vector/blue-wide-screen-webpage-business-600nw-695161762.jpg';

    const user = this.usersRepository.create({
      fullname,
      bio,
      email,
      username,
      profileImageUrl: profileImagePath,
      bannerImageUrl: defaultBannerUrl,
      password: hashedPassword,
    });

    const otp = this.otpService.generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now for otp expire

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    try {
      await this.usersRepository.save(user);
      console.log('User created');
      await this.emailService.sendOtpEmail(email, fullname, otp);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Username or Email already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async signIn(loginAuthCredentialsDto: LoginAuthCredentialsDto): Promise<{
    refresh_token?: string;
    access_token?: string;
    status?: number;
    message?: string;
  }> {
    const { username, password } = loginAuthCredentialsDto;
    const user = await this.usersRepository.findOne({ where: { username } });

    if (user && !user.is_verified) {
      // get the user's email
      const email = user.email;

      // Generate a new OTP and set the expiry
      const otp = this.otpService.generateOtp();
      const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now for otp expire

      // Update user with new OTP and OTP expiry
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await this.usersRepository.save(user);

      // Send email with the new OTP
      await this.emailService.sendOtpEmail(email, user.fullname, otp);

      throw new ForbiddenException(
        'Verification required. OTP sent to your email.',
      );
      // {
      //   status: 403,
      //   message: 'Verification required. OTP sent to your email.',
      // };
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      const payload: JwtPayload = { id: user.id };
      const refreshToken: string = await this.jwtService.sign(payload);

      // Send login notification email
      await this.emailService.sendLoginEmail(user.email, user.fullname);

      return { access_token: refreshToken, refresh_token: refreshToken };
    } else {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async logoutFromAllDevices(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { lastLogoutAt: new Date() });
  }

  async generateOtp(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = this.otpService.generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now for otp expire

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    await this.usersRepository.save(user);

    // send OTP to user email
    await this.emailService.sendOtpEmail(email, user.fullname, otp);
  }

  async validateOtp(email: string, otp: string): Promise<object> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException(
        'User with the provided email does not exist.',
      );
    }

    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException(
        'No OTP is set for this user or OTP has already been used.',
      );
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    if (user.otp == otp) {
      user.is_verified = true;
      user.otp = null;
      user.otpExpiry = null;
      await this.usersRepository.save(user);
      await this.emailService.sendAccountCreateEmail(user.email, user.fullname);
      return { status: 200, message: 'OTP verified successfully' };
    } else {
      throw new BadRequestException(
        'Invalid OTP. Please enter the correct OTP',
      );
    }
  }

  async resendOtp(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if OTP has already been used (if it's null)
    if (!user.otp) {
      throw new UnauthorizedException('OTP has already been validated.');
    }

    const otp = this.otpService.generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now for otp expire

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    await this.usersRepository.save(user);

    // Resend OTP to user email
    await this.emailService.sendOtpEmail(email, user.fullname, otp);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate OTP
    const otp = this.otpService.generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now for OTP to expire

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    await this.usersRepository.save(user);

    // Send OTP to user email
    await this.emailService.sendForgetPassEmail(email, user.fullname, otp);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<object> {
    const { email, otp, newPassword } = resetPasswordDto;
    const user = await this.usersRepository.findOne({ where: { email } });

    // check if the user exists or valid
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if OTP exist and are valid
    if (user.otp !== otp || new Date() > user.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user with new password and clear the OTP fields
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    await this.usersRepository.save(user);

    return { status: 200, message: 'Password reset successfully.' };
  }

  async getEmailByUsername(username: string): Promise<string | undefined> {
    // Implement the logic to retrieve the email by username
    const user = await this.usersRepository.findOne({ where: { username } });

    if (user) {
      return user.email;
    } else {
      return undefined; // Username not found
    }
  }

  async getUserIdFromUsername(username: string): Promise<string | undefined> {
    // Implement the logic to retrieve the email by username
    const user = await this.usersRepository.findOne({
      where: [{ username }, { fullname: username }],
    });

    if (user) {
      return user.id;
    } else {
      return undefined; // Username not found
    }
  }

  async getUserById(id: string): Promise<Users> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async getUserProfile(id: string): Promise<Users> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself.');
    }

    const follower = await this.usersRepository.findOne({
      where: { id: followerId },
    });
    const following = await this.usersRepository.findOne({
      where: { id: followingId },
    });

    if (!follower || !following) {
      throw new NotFoundException('Follower or following user not found.');
    }

    const block = await this.blocksRepository.findOne({
      where: [
        { blockerId: followerId, blockedId: followingId },
        { blockerId: followingId, blockedId: followerId },
      ],
    });

    if (block) {
      throw new ForbiddenException(
        'Following operation is not allowed because of block.',
      );
    }

    // Check if the follow relationship already exists
    const existingFollow = await this.followersRepository.findOne({
      where: { followerId, followingId },
    });

    if (existingFollow) {
      throw new ConflictException('You are already following this user.');
    }

    // Create a new follow relationship
    const follow = this.followersRepository.create({ followerId, followingId });
    await this.followersRepository.save(follow);

    // Update followerCount and followingCount for both users
    await this.usersRepository.increment(
      { id: followingId },
      'followerCount',
      1,
    );
    await this.usersRepository.increment(
      { id: followerId },
      'followingCount',
      1,
    );

    this.postsGateway.emitFollow({
      followerId,
      followingId,
      followerUsername: follower.username,
      followingUsername: following.username,
    });
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    // Check if the follow relationship exists
    const existingFollow = await this.followersRepository.findOne({
      where: { followerId, followingId },
    });

    if (!existingFollow) {
      // No follow relationship exists, throw an exception
      throw new BadRequestException('You are not following this user.');
    }

    // Remove the follow relationship
    await this.followersRepository.delete({ followerId, followingId });

    // Update followerCount and followingCount for both users
    await this.usersRepository.decrement(
      { id: followingId },
      'followerCount',
      1,
    );
    await this.usersRepository.decrement(
      { id: followerId },
      'followingCount',
      1,
    );
  }

  async isUserFollowing(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    const follow = await this.followersRepository.findOne({
      where: { followerId, followingId },
    });
    return !!follow; // Returns true if the follow exists, false otherwise
  }

  async getFollowers(userId: string): Promise<FollowerDto[]> {
    const followers = await this.followersRepository.find({
      where: { followingId: userId },
      relations: ['follower'],
    });
    return followers.map((follower) => ({
      id: follower.followerId,
      username: follower.follower.username,
      fullname: follower.follower.fullname,
      profileImageUrl: follower.follower.profileImageUrl,
    }));
  }

  async getFollowing(userId: string): Promise<FollowingDto[]> {
    const followings = await this.followersRepository.find({
      where: { followerId: userId },
      relations: ['following'],
    });
    return followings.map((following) => ({
      id: following.followingId,
      username: following.following.username,
      fullname: following.following.fullname,
      profileImageUrl: following.following.profileImageUrl,
    }));
  }

  async validateUsername(username: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: [{ username }, { fullname: username }],
    });
    return !!user;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    profileImageUrl?: string,
    bannerImageUrl?: string,
  ): Promise<{ message: string }> {
    const { username, email, fullname, bio } = updateProfileDto;

    // Check if all fields are undefined or null
    if (
      !username &&
      !email &&
      !fullname &&
      !bio &&
      !profileImageUrl &&
      !bannerImageUrl
    ) {
      throw new BadRequestException(
        'At least one field must be provided for update.',
      );
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Proceed with updating the fields that are provided
    user.username = username ?? user.username;
    user.email = email ?? user.email;
    user.fullname = fullname ?? user.fullname;
    user.bio = bio ?? user.bio;
    user.profileImageUrl = profileImageUrl ?? user.profileImageUrl;
    user.bannerImageUrl = bannerImageUrl ?? user.bannerImageUrl;

    try {
      await this.usersRepository.save(user);
      await this.emailService.sendEditEmail(user.email, user.fullname);
    } catch (error) {
      if (error.code === '23505') {
        // Handle unique constraint violation, e.g., username or email already exists
        throw new ConflictException('Username or Email already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }

    return { message: 'Profile updated successfully' };
  }

  async deleteUserById(userId: string): Promise<void> {
    // First, delete all posts by the user
    const userPosts = await this.postsRepository.find({ where: { userId } });
    await this.postsRepository.remove(userPosts);

    // Then, delete all followers and followings
    const followers = await this.followersRepository.find({
      where: [{ followerId: userId }, { followingId: userId }],
    });
    await this.followersRepository.remove(followers);

    // also delete all likes for the user
    const likes = await this.likesRepository.find({ where: { userId } });
    await this.likesRepository.remove(likes);

    // Finally, delete the user
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.remove(user);
  }

  async updatePrivacySetting(
    userId: string,
    isPrivate: boolean,
    isTagging: boolean,
  ): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isPrivate = isPrivate;
    user.allowTagging = isTagging;
    await this.usersRepository.save(user);
  }

  async getPrivacySetting(
    userId: string,
  ): Promise<{ isPrivate: boolean; isTagging: boolean }> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { isPrivate: user.isPrivate, isTagging: user.allowTagging };
  }

  async muteUser(muterId: string, mutedId: string): Promise<void> {
    // Create and save the mute relationship in the database
    const mute = this.mutedUsersRepository.create({ muterId, mutedId });
    await this.mutedUsersRepository.save(mute);
  }

  async unmuteUser(muterId: string, mutedId: string): Promise<void> {
    // Remove the mute relationship from the database
    await this.mutedUsersRepository.delete({ muterId, mutedId });
  }

  async getMutedUsers(userId: string): Promise<Users[]> {
    const mutedUsers = await this.mutedUsersRepository.find({
      where: { muterId: userId },
    });
    const mutedUserIds = mutedUsers.map((mute) => mute.mutedId);

    if (!mutedUserIds.length) {
      return [];
    }

    const users = await this.usersRepository.find({
      where: { id: In(mutedUserIds) },
    });

    return users;
  }

  async isUserMuted(muterId: string, mutedId: string): Promise<boolean> {
    const mute = await this.mutedUsersRepository.findOne({
      where: { muterId, mutedId },
    });
    return !!mute; // Returns true if the mute relationship exists, false otherwise
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const block = this.blocksRepository.create({ blockerId, blockedId });
    await this.blocksRepository.save(block);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.blocksRepository.delete({ blockerId, blockedId });
  }

  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.blocksRepository.findOne({
      where: { blockerId, blockedId },
    });
    return !!block;
  }

  async getBlockedUsers(userId: string): Promise<Users[]> {
    const blockedRelations = await this.blocksRepository.find({
      where: { blockerId: userId },
      relations: ['blocked'],
    });

    if (!blockedRelations.length) {
      throw new NotFoundException('Blocked users not found');
    }

    // Extract the Users entities from the blocked relations
    const blockedUsers = blockedRelations.map(
      (blockRelation) => blockRelation.blocked,
    );

    return blockedUsers;
  }
}
