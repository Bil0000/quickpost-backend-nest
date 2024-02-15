import { EntityRepository, Repository } from 'typeorm';
import { Posts } from './post.entity';

@EntityRepository(PostsRepository)
export class PostsRepository extends Repository<Posts> {}
