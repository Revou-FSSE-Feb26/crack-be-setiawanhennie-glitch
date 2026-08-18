import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private prisma: PrismaClient;
  private resend: Resend;

  constructor(private jwtService: JwtService) {
    this.prisma = new PrismaClient();
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async register(name: string, email: string, password: string, school?: string, className?: string, role?: string) {
    const safeRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    
    if (existingUser) throw new BadRequestException('Email sudah terdaftar');

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10); // Hash OTP
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        school,
        className,
        role: safeRole,
        verificationToken: hashedOtp,
        tokenExpiresAt,
      },
    });

    try {
      await this.resend.emails.send({
        from: 'NusaSkillz <onboarding@resend.dev>',
        to: email,
        subject: 'Kode Verifikasi NusaSkillz Anda',
        html: `...`,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      await this.prisma.user.delete({ where: { id: user.id } });
      throw new BadRequestException('Gagal mengirim email verifikasi. Silakan coba lagi.');
    }

    return { message: 'Registrasi berhasil. Silakan cek email Anda.' };
  }

  async verifyEmail(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) throw new BadRequestException('User tidak ditemukan');
    if (user.isVerified) throw new BadRequestException('Email sudah terverifikasi');

    const isValidOtp = await bcrypt.compare(otp, user.verificationToken);
    if (!isValidOtp || user.tokenExpiresAt < new Date()) {
      throw new BadRequestException('Kode OTP salah atau kedaluwarsa');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        isVerified: true, 
        verificationToken: null, 
        tokenExpiresAt: null 
      },
    });

    return { message: 'Email berhasil diverifikasi! Silakan login.' };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) throw new UnauthorizedException('Email atau password salah');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Email atau password salah');

    if (!user.isVerified) {
      throw new UnauthorizedException('Email belum terverifikasi. Silakan cek email Anda.');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Akun Anda ditangguhkan. Silakan hubungi support@nusaskillz.id untuk informasi lebih lanjut.');
    }

    const payload = { 
      sub: user.id,
      email: user.email, 
      role: user.role
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school,
        className: user.className,
      },
    };
  }
}