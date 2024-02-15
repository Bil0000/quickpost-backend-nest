import { EntityRepository, Repository } from 'typeorm';
import { Likes } from './like.entity';

@EntityRepository(LikesRepository)
export class LikesRepository extends Repository<Likes> {}
