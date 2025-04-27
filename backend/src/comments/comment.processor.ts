import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { Logger } from '@nestjs/common';

@Processor('comments')
export class CommentProcessor {
  private readonly logger = new Logger(CommentProcessor.name);

  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  @Process('permanent-delete')
  async handlePermanentDeletion(job: Job<{ commentId: string }>) {
    try {
      const { commentId } = job.data;
      const comment = await this.commentsRepository.findOne({
        where: { id: commentId },
        relations: ['replies'],
      });

      if (!comment) {
        this.logger.warn(`Comment ${commentId} not found for permanent deletion`);
        return;
      }

      // If comment has replies, recursively mark them for deletion
      if (comment.replies && comment.replies.length > 0) {
        await this.handleNestedReplies(comment.replies);
      }

      // Permanently delete the comment
      await this.commentsRepository.remove(comment);
      this.logger.log(`Permanently deleted comment ${commentId}`);
    } catch (error) {
      this.logger.error(`Error during permanent deletion: ${error.message}`);
      throw error;
    }
  }

  private async handleNestedReplies(replies: Comment[]) {
    for (const reply of replies) {
      if (reply.replies && reply.replies.length > 0) {
        await this.handleNestedReplies(reply.replies);
      }
      await this.commentsRepository.remove(reply);
    }
  }
}