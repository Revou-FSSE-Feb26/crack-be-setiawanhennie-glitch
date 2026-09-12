import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Resend } from 'resend';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private resend: Resend;

  constructor(private jwtService: JwtService) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async register(name: string, email: string, password: string, school?: string, className?: string, role?: string) {
    const safeRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) throw new BadRequestException('Email sudah terdaftar');

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.user.create({
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
      await prisma.user.delete({ where: { id: user.id } });
      throw new BadRequestException('Gagal mengirim email verifikasi. Silakan coba lagi.');
    }

    return { message: 'Registrasi berhasil. Silakan cek email Anda.' };
  }

  async verifyEmail(email: string, otp: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) throw new BadRequestException('User tidak ditemukan');
    if (user.isVerified) throw new BadRequestException('Email sudah terverifikasi');

    const isValidOtp = await bcrypt.compare(otp, user.verificationToken);
    if (!isValidOtp || user.tokenExpiresAt < new Date()) {
      throw new BadRequestException('Kode OTP salah atau kedaluwarsa');
    }

    await prisma.user.update({
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
    const user = await prisma.user.findUnique({ where: { email } });
    
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

    async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Never reveal whether the account exists
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      });
      const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      await this.resend.emails.send({
        from: process.env.RESEND_FROM || 'NusaSkillz <onboarding@resend.dev>', // same as your OTP email
        to: email,
        subject: 'Reset Password NusaSkillz',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
            <h2>🔑 Reset Password</h2>
            <p>Halo ${user.name}, klik tombol di bawah untuk mengganti password Anda:</p>
            <a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
              Reset Password
            </a>
            <p style="color:#888;font-size:12px;margin-top:16px">
              Tautan berlaku 1 jam. Jika Anda tidak meminta ini, abaikan email ini.
            </p>
          </div>
        `,
      });
    }
    return { message: 'Jika email terdaftar, tautan reset telah dikirim.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Tautan reset tidak valid atau kedaluwarsa');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password minimal 8 karakter');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    });
    return { message: 'Password berhasil diubah. Silakan masuk.' };
  }
}