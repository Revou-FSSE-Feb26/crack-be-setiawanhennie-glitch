import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('Token tidak ditemukan');

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Token tidak valid atau kedaluwarsa');
    }

    const userRecord = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!userRecord) throw new UnauthorizedException('Pengguna tidak ditemukan');
    if (userRecord.isSuspended) throw new UnauthorizedException('Akun Anda ditangguhkan.');

    // 👈 Now every controller knows who AND which school
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      school: userRecord.school ?? null,
    };
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}