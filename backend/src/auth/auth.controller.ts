import { Controller, Post, Body, UseGuards, Get, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    try {
      const user = await this.authService.validateUser(loginDto.email, loginDto.password);
      
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      return this.authService.login(user);
    } catch (error) {
      // Re-throw the error to ensure proper HTTP status codes
      throw error;
    }
  }

  @Public()
  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
  // Now you can safely access body.email and body.password
    return this.authService.register(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }
}
