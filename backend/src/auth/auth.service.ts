import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private validatePasswordStrength(password: string): string | null {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  }

  async validateUser(email: string, password: string): Promise<any> {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m', // Access token expires in 15 minutes
        secret: this.configService.get('JWT_SECRET'),
      }),
      this.jwtService.signAsync(
        { ...payload, tokenType: 'refresh' },
        {
          expiresIn: '7d', // Refresh token expires in 7 days
          secret: this.configService.get('JWT_REFRESH_SECRET'),
        },
      ),
    ]);

    // Store refresh token hash in database
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, refreshTokenHash);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email
      }
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify refresh token hash
      const isValidRefreshToken = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isValidRefreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async register(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Please enter a valid email address');
    }

    // Validate password strength
    const passwordError = this.validatePasswordStrength(password);
    if (passwordError) {
      throw new BadRequestException(passwordError);
    }

    // Check if user exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('Email already in use');
    }
    
    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await this.usersService.createUser(email, hashedPassword);
    
    // Return user without password
    const { password: _, ...result } = newUser;
    return result;
  }

  async logout(userId: string) {
    // Clear refresh token
    await this.usersService.updateRefreshToken(userId, null);
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    const { password: _, refreshToken: __, ...result } = user;
    return result;
  }
}
