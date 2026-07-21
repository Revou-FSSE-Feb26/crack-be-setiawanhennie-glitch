import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

// Simple DTOs for validation (optional but good practice)
class RegisterDto { 
  name: string; 
  email: string; 
  password: string; 
  school?: string;
  className?: string;
}

class VerifyDto { email: string; otp: string; }
class LoginDto { email: string; password: string; }

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.name, body.email, body.password, body.school, body.className);
  }

  @Post('verify')
  async verify(@Body() body: VerifyDto) {
    return this.authService.verifyEmail(body.email, body.otp);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }
}