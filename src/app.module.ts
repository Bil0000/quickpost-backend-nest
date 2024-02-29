import { Module } from '@nestjs/common';
import { AuthModule } from './services/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostModule } from './services/post/post.module';
import { SearchService } from './services/search/search.service';
import { SearchController } from './services/search/search.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'quickpost',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    PostModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class AppModule {}
