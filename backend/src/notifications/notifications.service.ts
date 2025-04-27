import { Injectable, NotFoundException, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectQueue('notifications') private notificationsQueue: Queue
  ) {}

  async onModuleInit() {
    // Schedule cleanup job to run at midnight every day
    await this.notificationsQueue.add(
      'cleanup',
      {},
      {
        repeat: {
          cron: '0 0 * * *' // Every day at midnight
        }
      }
    );
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: {
        recipient: { id: userId }
      },
      order: {
        createdAt: 'DESC'
      },
      relations: ['comment', 'recipient'],
      take: 50
    });
  }

  async createNotification(data: {
    recipientId: string;
    type: NotificationType;
    message: string;
    commentId?: string;
    parentContent?: string;
  }): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      recipient: { id: data.recipientId },
      type: data.type,
      message: data.message,
      comment: data.commentId ? { id: data.commentId } : null,
      parentContent: data.parentContent,
      read: false
    });

    return this.notificationsRepository.save(notification);
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
      relations: ['recipient']
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipient.id !== userId) {
      throw new UnauthorizedException('Cannot mark someone else\'s notification as read');
    }

    notification.read = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository
      .createQueryBuilder('notification')
      .update()
      .set({ read: true })
      .where('recipientId = :userId AND read = false', { userId })
      .execute();
  }

  async deleteOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.notificationsRepository
      .createQueryBuilder()
      .delete()
      .where('read = true AND createdAt < :date', { date: thirtyDaysAgo })
      .execute();
  }
}
