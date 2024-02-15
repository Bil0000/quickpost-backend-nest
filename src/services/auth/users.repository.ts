import { EntityRepository, Repository } from 'typeorm';
import { Users } from './user.entity';

@EntityRepository(UsersRepository)
export class UsersRepository extends Repository<Users> {}
