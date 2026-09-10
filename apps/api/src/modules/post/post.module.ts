import { Module } from '@nestjs/common';
import { MediaModule } from '../media/index.js';
import { PostController } from './post.controller.js';
import { PostRepository } from './post.repository.js';
import { PostService } from './post.service.js';

@Module({
  imports: [MediaModule],
  controllers: [PostController],
  providers: [PostService, PostRepository],
  exports: [PostRepository],
})
export class PostModule {}
