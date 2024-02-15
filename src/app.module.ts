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
      host: 'dpg-cn79i3uct0pc738teka0-a',
      port: 5432,
      username: 'quickpost_zr61_user',
      password: 'OuLKUExn3pQKA0996YtMY4aMCuepWj1g',
      database: 'quickpost_zr61',
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
