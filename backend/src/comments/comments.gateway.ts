import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*', // More permissive for troubleshooting
    credentials: true
  },
  path: '/socket.io'
})
export class CommentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSockets: Map<string, string[]> = new Map();

  handleConnection(client: Socket) {
    console.log(`WebSocket client connected: ${client.id}`);
    console.log(`Auth token exists: ${!!client.handshake.auth?.token}`);
    
    const userId = client.handshake.auth?.token ? this.getUserIdFromToken(client.handshake.auth.token) : null;
    if (userId) {
      const userSockets = this.userSockets.get(userId) || [];
      this.userSockets.set(userId, [...userSockets, client.id]);
      console.log(`User ${userId} connected with socket ${client.id}`);
    } else {
      console.log(`Socket ${client.id} connected without valid authentication`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`WebSocket client disconnected: ${client.id}`);
    
    for (const [userId, sockets] of this.userSockets.entries()) {
      const updatedSockets = sockets.filter(id => id !== client.id);
      if (updatedSockets.length === 0) {
        this.userSockets.delete(userId);
        console.log(`All sockets for user ${userId} disconnected`);
      } else {
        this.userSockets.set(userId, updatedSockets);
        console.log(`Socket ${client.id} for user ${userId} disconnected. ${updatedSockets.length} connections remaining`);
      }
    }
  }

  broadcastComment(payload: any) {
    this.server.emit('commentUpdate', payload);
  }

  notifyUser(userId: string, notification: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.length) {
      socketIds.forEach(socketId => {
        this.server.to(socketId).emit('notification', notification);
      });
    }
  }

  private getUserIdFromToken(token: string): string | null {
    try {
      // Basic JWT payload extraction - in production use proper verification
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
      return payload.sub;
    } catch (e) {
      return null;
    }
  }

  @SubscribeMessage('markNotificationRead')
  handleMarkNotificationRead(client: Socket, payload: { id: string }) {
    // This will be handled by the NotificationsService
  }
}
