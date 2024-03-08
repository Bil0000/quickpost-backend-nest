import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity()
export class Comments {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  postId: string;

  @Column()
  userId: string;

  @Column()
  text: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Comments, { nullable: true })
  parentComment: Comments;

  @OneToMany(() => Comments, (comments) => comments.parentComment)
  replies: Comment[];

  @Column({ nullable: true })
  commentImageUrl: string;
}
