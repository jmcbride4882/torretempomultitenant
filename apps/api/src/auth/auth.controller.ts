import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

// Placeholder DTOs - will be implemented in Wave 2
class LoginDto {
  email!: string;
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    // Placeholder - will be implemented in Wave 2
    return {
      message: 'Login endpoint - implementation coming in Wave 2',
      email: dto.email,
    };
  }

  @Post('logout')
  async logout() {
    return { message: 'Logged out' };
  }

  @Get('me')
  async me() {
    // Placeholder - will be implemented in Wave 2
    return {
      message: 'Me endpoint - implementation coming in Wave 2',
    };
  }
}
