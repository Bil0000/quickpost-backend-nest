import { EntityRepository, Repository } from 'typeorm';
import { Comments } from './comments.entity';

@EntityRepository(CommentsRepository)
export class CommentsRepository extends Repository<Comments> {}
