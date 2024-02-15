import { EntityRepository, Repository } from 'typeorm';
import { mutedusers } from './mutedusers.entity';

@EntityRepository(mutedusersRepository)
export class mutedusersRepository extends Repository<mutedusers> {}
