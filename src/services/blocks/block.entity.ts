import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Users } from '../auth/user.entity'; // Adjust the path based on your project structure

@Entity()
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Users, (user) => user.blockerActions)
  blocker: Users;

  @Column()
  blockerId: string;

  @ManyToOne(() => Users, (user) => user.blockedActions)
  blocked: Users;

  @Column()
  blockedId: string;
}
