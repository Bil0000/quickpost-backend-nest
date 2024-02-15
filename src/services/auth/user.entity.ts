import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Followers } from '../followers/follower.entity';
import { Block } from '../blocks/block.entity';

@Entity()
export class Users {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullname: string;

  @Column()
  bio: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({ nullable: true })
  bannerImageUrl: string;

  @Column({ default: 0 })
  followerCount: number;

  @Column({ default: 0 })
  followingCount: number;

  @OneToMany(() => Followers, (followers) => followers.follower)
  followers: Followers[];

  @OneToMany(() => Followers, (following) => following.following)
  following: Followers[];

  @OneToMany(() => Block, (block) => block.blocker)
  blockerActions: Block[];

  @OneToMany(() => Block, (block) => block.blocked)
  blockedActions: Block[];

  @Column()
  password: string;

  @Column({ default: false })
  isPrivate: boolean;

  @Column({ default: true })
  allowTagging: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLogoutAt: Date;

  @Column({ nullable: true })
  otp: string;

  @Column({ type: 'timestamp', nullable: true })
  otpExpiry: Date;

  @Column({ default: false })
  is_verified: boolean;
}
