import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Comment } from './comment.entity';
import { User } from '../users/user.entity';
import { CommentsGateway } from './comments.gateway';
import { LessThan } from 'typeorm';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private commentsRepo: Repository<Comment>,
    @InjectQueue('comments') private commentsQueue: Queue,
    private commentsGateway: CommentsGateway,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    // Schedule clean-up of deleted comments
    this.scheduleCleanup();
  }

  private scheduleCleanup() {
    setInterval(async () => {
      const deletedComments = await this.commentsRepo.find({
        where: {
          deletedAt: LessThan(new Date(Date.now() - 15 * 60 * 1000))
        }
      });

      for (const comment of deletedComments) {
        await this.commentsQueue.add('permanent-delete', {
          commentId: comment.id
        });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Add the missing findOne method
  async findOne(id: string) {
    // Try to get from cache first
    const cacheKey = `comment:${id}`;
    const cachedComment = await this.cacheManager.get(cacheKey);
    
    if (cachedComment) {
      return cachedComment;
    }
    
    const comment = await this.commentsRepo.findOne({
      where: { id },
      relations: ['user']
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    let result;
    // If it's a reply, we don't need to get its replies
    if (comment.parent) {
      result = comment;
    } else {
      // If it's a root comment, get its replies with pagination
      result = {
        ...comment,
        replies: await this.getReplies(id, 0, 5) // Default to 5 replies per page
      };
    }
    
    // Store in cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);
    
    return result;
  }

  async getReplies(parentId: string, skip = 0, take = 5): Promise<any> {
    // Check cache for replies
    const cacheKey = `replies:${parentId}:${skip}:${take}`;
    const cachedReplies = await this.cacheManager.get<any[]>(cacheKey);
    
    if (cachedReplies) {
      return cachedReplies;
    }
    
    const [replies, total] = await this.commentsRepo.findAndCount({
      where: { parent: { id: parentId }, deletedAt: null },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      skip,
      take
    });
    
    const repliesWithNestedReplies = await Promise.all(
      replies.map(async reply => {
        const hasMoreReplies = await this.commentsRepo.count({
          where: { parent: { id: reply.id }, deletedAt: null }
        });
        
        return {
          ...reply,
          replyCount: hasMoreReplies,
          replies: hasMoreReplies > 0 ? await this.getReplies(reply.id, 0, 3) : [] // Show first 3 nested replies
        };
      })
    );
    
    const result = {
      items: repliesWithNestedReplies,
      total,
      hasMore: total > skip + take
    };
    
    // Cache replies for 3 minutes
    await this.cacheManager.set(cacheKey, result, 180000);
    
    return result;
  }

  async create(content: string, user: User, parentId?: string) {
    const comment = new Comment();
    comment.content = content;
    comment.user = user;
    
    if (parentId) {
      const parent = await this.commentsRepo.findOne({ 
        where: { id: parentId },
        relations: ['user'] 
      });
      
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
      
      comment.parent = parent;
      
      // Notify parent author about the reply
      this.commentsGateway.notifyUser(parent.user.id, {
        type: 'reply',
        commentId: comment.id,
        message: `New reply to your comment from ${user.email}`,
        parentContent: parent.content.substring(0, 50) + (parent.content.length > 50 ? '...' : '')
      });
    }
    
    const savedComment = await this.commentsRepo.save(comment);
    
    // Invalidate cache for parent comment if this is a reply
    if (parentId) {
      await this.cacheManager.del(`comment:${parentId}`);
    }
    
    // Broadcast the new comment
    this.commentsGateway.broadcastComment({
      action: 'create',
      comment: savedComment
    });
    
    return savedComment;
  }

  async getThreads(skip = 0, take = 20) {
    // Try to get from cache first
    const cacheKey = `threads:${skip}:${take}`;
    const cachedThreads = await this.cacheManager.get(cacheKey);
    
    if (cachedThreads) {
      return cachedThreads;
    }
    
    // Get root comments (comments without parents)
    const rootComments = await this.commentsRepo.find({
      where: { parent: null, deletedAt: null },
      relations: ['user'],
      skip,
      take,
      order: { createdAt: 'DESC' }
    });
    
    // For each root comment, recursively get all replies
    const commentsWithReplies = await Promise.all(
      rootComments.map(async comment => {
        return {
          ...comment,
          replies: await this.getReplies(comment.id)
        };
      })
    );
    
    // Store in cache for 2 minutes (shorter time since this is frequently updated)
    await this.cacheManager.set(cacheKey, commentsWithReplies, 120000);
    
    return commentsWithReplies;
  }

  async update(commentId: string, content: string, userId: string) {
    const comment = await this.commentsRepo.findOne({
      where: { id: commentId },
      relations: ['user']
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the author
    if (comment.user.id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Check if within 15-minute window
    const now = new Date();
    const createdAt = new Date(comment.createdAt);
    const differenceInMinutes = (now.getTime() - createdAt.getTime()) / 60000;

    if (differenceInMinutes > 15) {
      throw new ForbiddenException('Comments can only be edited within 15 minutes of posting');
    }

    comment.content = content;
    comment.updatedAt = new Date();

    const updatedComment = await this.commentsRepo.save(comment);
    
    // Invalidate cache for this comment
    await this.cacheManager.del(`comment:${commentId}`);
    
    // Broadcast the update
    this.commentsGateway.broadcastComment({
      action: 'update',
      comment: updatedComment
    });

    return updatedComment;
  }

  async softDelete(commentId: string, userId: string) {
    const comment = await this.commentsRepo.findOne({
      where: { id: commentId },
      relations: ['user']
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the author
    if (comment.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    comment.deletedAt = new Date();
    const result = await this.commentsRepo.save(comment);
    
    // Invalidate caches for this comment
    await this.cacheManager.del(`comment:${commentId}`);
    
    // If it has a parent, invalidate parent's replies cache
    if (comment.parent) {
      await this.cacheManager.del(`replies:${comment.parent.id}`);
    }
    
    // Broadcast the deletion
    this.commentsGateway.broadcastComment({
      action: 'delete',
      commentId
    });

    return result;
  }

  async restore(commentId: string, userId: string) {
    const comment = await this.commentsRepo.findOne({
      where: { id: commentId },
      relations: ['user']
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the author
    if (comment.user.id !== userId) {
      throw new ForbiddenException('You can only restore your own comments');
    }

    // Check if within 15-minute window of deletion
    if (!comment.deletedAt) {
      throw new ForbiddenException('Comment is not deleted');
    }
    
    const now = new Date();
    const deletedAt = new Date(comment.deletedAt);
    const differenceInMinutes = (now.getTime() - deletedAt.getTime()) / 60000;

    if (differenceInMinutes > 15) {
      throw new ForbiddenException('Comments can only be restored within 15 minutes of deletion');
    }

    comment.deletedAt = null;
    const restoredComment = await this.commentsRepo.save(comment);
    
    // Invalidate caches for this comment
    await this.cacheManager.del(`comment:${commentId}`);
    
    // If it has a parent, invalidate parent's replies cache
    if (comment.parent) {
      await this.cacheManager.del(`replies:${comment.parent.id}`);
    }
    
    // Broadcast the restoration
    this.commentsGateway.broadcastComment({
      action: 'restore',
      comment: restoredComment
    });

    return restoredComment;
  }
}