import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { Comment } from '../comments/comment.entity';

@Module({
  imports: [
    TerminusModule, 
    HttpModule,
    TypeOrmModule.forFeature([Comment])
  ],
  controllers: [HealthController],
})
export class HealthModule {}
