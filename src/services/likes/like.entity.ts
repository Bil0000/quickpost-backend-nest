import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Likes {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  postId: string;
}
