import { Injectable } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationsService } from './notifications.service';

@Injectable()
@Processor('notifications')
export class NotificationProcessor {
  constructor(private notificationsService: NotificationsService) {}

  @Process('cleanup')
  async handleCleanup(job: Job) {
    await this.notificationsService.deleteOldNotifications();
    return { success: true };
  }
}