import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client = context.switchToWs().getClient();
      const token = client.handshake?.auth?.token;
      
      console.log('[WsJwtGuard] Validating socket connection:', { 
        socketId: client.id,
        hasToken: !!token
      });
      
      if (!token) {
        console.log('[WsJwtGuard] Missing auth token');
        throw new WsException('Missing auth token');
      }
      
      try {
        const payload = this.jwtService.verify(token);
        console.log(`[WsJwtGuard] Valid token for user ${payload.sub || payload.userId}`);
        client.user = payload;
        return true;
      } catch (jwtError) {
        console.error('[WsJwtGuard] JWT verification failed:', jwtError.message);
        throw new WsException('Invalid auth token');
      }
    } catch (err) {
      console.error('[WsJwtGuard] Socket authentication error:', err.message);
      throw new WsException('Authentication failed');
    }
  }
}
