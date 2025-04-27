import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Req() req: any): Promise<{ notifications: Notification[] }> {
    const notifications = await this.notificationsService.getNotifications(req.user.userId);
    return { notifications };
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any): Promise<{ success: boolean }> {
    await this.notificationsService.markAsRead(id, req.user.userId);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: any): Promise<{ success: boolean }> {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { success: true };
  }
}
