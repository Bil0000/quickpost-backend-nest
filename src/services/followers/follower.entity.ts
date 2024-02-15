import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Users } from '../auth/user.entity';

@Entity()
export class Followers {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  followerId: string;

  @Column()
  followingId: string;

  @ManyToOne(() => Users, (user) => user.followers)
  @JoinColumn({ name: 'followerId' })
  follower: Users;

  @ManyToOne(() => Users, (user) => user.following)
  @JoinColumn({ name: 'followingId' })
  following: Users;
}
