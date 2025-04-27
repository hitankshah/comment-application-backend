import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Comment } from './comment.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CommentsGateway } from './comments.gateway';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    BullModule.registerQueue({
      name: 'comments',
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3
      }
    }),
    CacheModule.register(),
  ],
  providers: [CommentsService, CommentsGateway],
  controllers: [CommentsController],
  exports: [CommentsService, CommentsGateway],
})
export class CommentsModule {}
