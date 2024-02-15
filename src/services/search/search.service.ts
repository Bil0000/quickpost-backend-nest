import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/services/auth/user.entity';
import { UsersRepository } from 'src/services/auth/users.repository';
import { Posts } from 'src/services/post/post.entity';
import { PostsRepository } from 'src/services/post/posts.repository';
import { ILike } from 'typeorm';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Users)
    private usersRepository: UsersRepository,
    @InjectRepository(Posts)
    private postsRepository: PostsRepository,
  ) {}

  async search(query: string): Promise<{ users: Users[]; posts: Posts[] }> {
    const users = await this.usersRepository.find({
      where: [
        { username: ILike(`%${query}%`) },
        { fullname: ILike(`%${query}%`) },
      ],
    });

    const posts = await this.postsRepository.find({
      where: [{ caption: ILike(`%${query}%`) }],
    });

    return { users, posts };
  }
}
