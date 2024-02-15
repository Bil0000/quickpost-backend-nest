import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class mutedusers {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  muterId: string;

  @Column()
  mutedId: string;
}
