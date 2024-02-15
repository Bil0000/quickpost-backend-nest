import { EntityRepository, Repository } from 'typeorm';
import { Block } from './block.entity';

@EntityRepository(BlocksRepository)
export class BlocksRepository extends Repository<Block> {}
