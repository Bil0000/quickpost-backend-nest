import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Posts {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  caption: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  videoUrl: string;

  @Column()
  userId: string;

  @Column()
  username: string;

  @Column()
  profileImageUrl: string;

  @Column()
  createdat: Date;

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  commentCount: number;
}
