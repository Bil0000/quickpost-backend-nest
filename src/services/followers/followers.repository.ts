import { EntityRepository, Repository } from 'typeorm';
import { Followers } from './follower.entity';

@EntityRepository(FollowersRepository)
export class FollowersRepository extends Repository<Followers> {}
