import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller.js';
import { CommentRepository } from './comment.repository.js';
import { CommentService } from './comment.service.js';

@Module({
  controllers: [CommentController],
  providers: [CommentService, CommentRepository],
  exports: [CommentRepository],
})
export class CommentModule {}
