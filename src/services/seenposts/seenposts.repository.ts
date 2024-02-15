import { EntityRepository, Repository } from 'typeorm';
import { SeenPosts } from './seenposts.entity';

@EntityRepository(seenPostsRepository)
export class seenPostsRepository extends Repository<SeenPosts> {}
