  import { Controller, Get, Inject, Req, Headers } from '@nestjs/common';
import { 
  HealthCheckService, 
  HttpHealthIndicator, 
  TypeOrmHealthIndicator, 
  HealthCheck,
  DiskHealthIndicator, 
  MemoryHealthIndicator 
} from '@nestjs/terminus';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../comments/comment.entity';
import { Public } from '../auth/decorators/public.decorator';
import { MoreThanOrEqual, IsNull, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService,
    @InjectRepository(Comment) private commentRepo: Repository<Comment>
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check(@Req() request: Request, @Headers() headers: Record<string, string>) {
    const corsOrigin = this.configService.get('CORS_ORIGIN', '*');
    
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database'),
      
      // Disk space check
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
      
      // Memory check
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      
      // CORS and request diagnostics
      () => Promise.resolve({
        cors: {
          status: 'up',
          configured: corsOrigin,
          requestOrigin: headers.origin || 'No Origin Header',
          requestHost: headers.host,
          userAgent: headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      })
    ]);
  }

  @Get('comments')
  @Public()
  @HealthCheck()
  async checkComments() {
    // Get current timestamp
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get comment metrics
    const [
      totalComments, 
      commentsLast24h, 
      commentsLastWeek,
      activeThreads,
      deletedComments
    ] = await Promise.all([
      this.commentRepo.count(),
      this.commentRepo.count({ 
        where: { createdAt: MoreThanOrEqual(oneDayAgo) }
      }),
      this.commentRepo.count({ 
        where: { createdAt: MoreThanOrEqual(oneWeekAgo) }
      }),
      this.commentRepo.count({ 
        where: { parent: null, deletedAt: IsNull() }
      }),
      this.commentRepo.count({
        where: { deletedAt: Not(IsNull()) }
      })
    ]);
    
    return this.health.check([
      () => Promise.resolve({
        comments: {
          status: 'up',
          metrics: {
            total: totalComments,
            last24Hours: commentsLast24h,
            lastWeek: commentsLastWeek,
            activeThreads: activeThreads,
            deletedComments: deletedComments,
            activityRate: commentsLast24h / (totalComments || 1)
          }
        }
      })
    ]);
  }
}
