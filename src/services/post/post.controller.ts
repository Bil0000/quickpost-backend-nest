import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { Posts } from './post.entity';
import { GetUser } from '../auth/get-user.decorator';
import { Users } from '../auth/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { EditPostDto } from './dto/edit-post.dto';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';

@Controller('post')
export class PostController {
  constructor(private postService: PostService) {}

  // @Post('/create')
  // @UseGuards(AuthGuard('jwt'))
  // @UseInterceptors(FileInterceptor('image')) // 'image' corresponds to the name of the file input field in the form
  // async createPost(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body() createPostDto: CreatePostDto,
  //   @GetUser() user: Users,
  // ) {
  //   const imageUrl = file ? `localhost:3000/uploads/${file.filename}` : null;
  //   return this.postService.createPost(createPostDto, imageUrl, user.id);
  // }

  @Post('/create')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  async createPost(
    @UploadedFiles()
    files: { image?: Express.Multer.File[]; video?: Express.Multer.File[] },
    @Body() createPostDto: CreatePostDto,
    @GetUser() user: Users,
  ) {
    // Initialize imageURL and videoURL to null
    let imageUrl: string | null = null;
    let videoUrl: string | null = null;

    // Handle GIF URLs directly from the body without expecting an uploaded file
    if (createPostDto.gifUrl) {
      imageUrl = createPostDto.gifUrl;
    } else {
      // Proceed with handling file uploads if any
      if (files?.image?.[0]) {
        imageUrl = `localhost:3000/uploads/${files.image[0].filename}`;
      }
      if (files?.video?.[0]) {
        videoUrl = `localhost:3000/uploads/${files.video[0].filename}`;
      }
    }

    // Call your service to process the post creation
    return this.postService.createPost(
      createPostDto,
      imageUrl,
      videoUrl,
      user.id,
    );
  }

  @UseGuards(AuthGuard())
  @Post('/:postId/like')
  likePost(
    @Param('postId') postId: string,
    @GetUser() user: Users,
  ): Promise<void> {
    return this.postService.likePost(user.id, postId);
  }

  @UseGuards(AuthGuard())
  @Post('/:postId/unlike')
  unlikePost(
    @Param('postId') postId: string,
    @GetUser() user: Users,
  ): Promise<void> {
    return this.postService.unlikePost(user.id, postId);
  }

  @UseGuards(AuthGuard())
  @Get('/posts')
  async getAllPosts(@GetUser() user: Users): Promise<Posts[]> {
    return this.postService.getAllPosts(user.id);
  }

  @Get('/user/:userId/post-count')
  async getPostCountByUserId(
    @Param('userId') userId: string,
  ): Promise<{ postCount: number }> {
    const postCount = await this.postService.countPostsByUserId(userId);
    return { postCount };
  }

  @Get('/user/:userId/posts')
  async getUserPosts(@Param('userId') userId: string): Promise<Posts[]> {
    return this.postService.getUserPosts(userId);
  }

  @UseGuards(AuthGuard())
  @Delete('/delete/:id')
  deletePost(
    @Param('id') postId: string,
    @GetUser() user: Users,
  ): Promise<void> {
    return this.postService.deletePost(postId, user);
  }

  @UseGuards(AuthGuard())
  @Patch('/edit/:id')
  async editPost(
    @Param('id') postId: string,
    @Body() editPostDto: EditPostDto,
    @GetUser() user: Users,
  ): Promise<Posts> {
    return this.postService.editPost(postId, user.id, editPostDto);
  }

  @Get('/hashtag/:tag')
  async getHashtagPost(@Param('tag') hashTag: string): Promise<Posts[]> {
    return await this.postService.getHashtagPost(hashTag);
  }

  @UseGuards(AuthGuard())
  @Post('/:postid/seen')
  async seenPost(
    @GetUser() user: Users,
    @Param('postid') postId: string,
  ): Promise<void> {
    return await this.postService.markPostAsSeen(user.id, postId);
  }

  @Get('/:id')
  getOnePost(@Param('id') id: string): Promise<Posts> {
    return this.postService.getOnePost(id);
  }
}
