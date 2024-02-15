import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SeenPosts {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  postId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  seenAt: Date;
}
