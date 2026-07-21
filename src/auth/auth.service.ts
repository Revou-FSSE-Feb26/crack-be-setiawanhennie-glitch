import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // 1. REGISTER
  async register(name: string, email: string, password: string, school?: string, className?: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new BadRequestException('Email sudah terdaftar');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Save user to DB
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken: otp,
        tokenExpiresAt,
        school,
        className,
      },
    });

    // Send Email via Resend
    await resend.emails.send({
      from: 'NusaSkillz <onboarding@resend.dev>', // Use your verified domain later
      to: email,
      subject: 'Kode Verifikasi NusaSkillz Anda',
      html: `
        <h1>Halo ${name}!</h1>
        <p>Terima kasih telah bergabung dengan NusaSkillz.</p>
        <p>Gunakan kode berikut untuk memverifikasi email Anda:</p>
        <h2 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px;">${otp}</h2>
        <p>Kode ini akan kedaluwarsa dalam 15 menit.</p>
      `,
    });

    return { message: 'Pendaftaran berhasil! Silakan cek email Anda untuk kode verifikasi.' };
  }

  // 2. VERIFY EMAIL
  async verifyEmail(email: string, otp: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User tidak ditemukan');
    if (user.isVerified) throw new BadRequestException('Email sudah terverifikasi');

    if (user.verificationToken !== otp || user.tokenExpiresAt < new Date()) {
      throw new BadRequestException('Kode OTP salah atau kedaluwarsa');
    }

    // Mark as verified and clear token
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

  // 3. LOGIN
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Email atau password salah');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Email atau password salah');

    if (!user.isVerified) {
      throw new UnauthorizedException('Email belum terverifikasi. Silakan cek email Anda.');
    }

    // Generate JWT Token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return { 
      access_token: token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    };
  }
}