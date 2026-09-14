import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generateSchoolCode } from '../school/school.service';

const prisma = new PrismaClient();

@Injectable()
export class SuperService {
  // 📈 Platform pulse
  async getStats() {
    const [schools, students, teachers, admins, xpAgg] = await Promise.all([
      prisma.school.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.aggregate({ _sum: { xp: true } }),
    ]);
    return {
      schools,
      students,
      teachers,
      admins,
      totalXp: xpAgg._sum.xp ?? 0,
    };
  }

  // 🏫 Schools + per-school user counts
  async getSchools() {
    const [schools, counts] = await Promise.all([
      prisma.school.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.user.groupBy({
        by: ['school', 'role'],
        where: { school: { not: null } },
        _count: { _all: true },
      }),
    ]);
    return schools.map((s) => {
      const rows = counts.filter((c) => c.school === s.name);
      const pick = (role: string) => rows.find((r) => r.role === role)?._count._all ?? 0;
      return { ...s, students: pick('STUDENT'), teachers: pick('TEACHER'), admins: pick('ADMIN') };
    });
  }

  // 🎁 Onboard a school + its first admin in ONE transaction
  async onboardSchool(data: {
    schoolName: string;
    address?: string;
    principal?: string;
    classList?: string[];
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    if (!data.schoolName?.trim()) throw new BadRequestException('Nama sekolah wajib diisi');
    const existingSchool = await prisma.school.findUnique({ where: { name: data.schoolName.trim() } });
    if (existingSchool) throw new BadRequestException('Sekolah dengan nama ini sudah terdaftar');
    const existingUser = await prisma.user.findUnique({ where: { email: data.adminEmail?.toLowerCase() } });
    if (existingUser) throw new BadRequestException('Email admin sudah digunakan');
    if (!data.adminPassword || data.adminPassword.length < 8) {
      throw new BadRequestException('Password admin minimal 8 karakter');
    }

    const hashed = await bcrypt.hash(data.adminPassword, 10);

    const school = await prisma.$transaction(async (tx) => {
      const sch = await tx.school.create({
        data: {
          name: data.schoolName.trim(),
          code: generateSchoolCode(data.schoolName),
          address: data.address,
          principal: data.principal,
          classList: data.classList?.length ? data.classList : ['10', '11', '12'],
        },
      });
      await tx.user.create({
        data: {
          name: data.adminName.trim(),
          email: data.adminEmail.trim().toLowerCase(),
          password: hashed,
          role: 'ADMIN',
          school: sch.name,
          isVerified: true,
        },
      });
      return sch;
    });

    return { school, code: school.code, adminEmail: data.adminEmail.trim().toLowerCase() };
  }

  // 👥 Admins of one school
  async getSchoolAdmins(schoolId: string) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('Sekolah tidak ditemukan');
    return prisma.user.findMany({
      where: { school: school.name, role: 'ADMIN' },
      select: { id: true, name: true, email: true, isSuspended: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ➕ Add another admin to a school
  async addSchoolAdmin(schoolId: string, data: { name: string; email: string; password: string }) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('Sekolah tidak ditemukan');
    const existing = await prisma.user.findUnique({ where: { email: data.email?.toLowerCase() } });
    if (existing) throw new BadRequestException('Email sudah digunakan');
    if (!data.password || data.password.length < 8) throw new BadRequestException('Password minimal 8 karakter');
    const hashed = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: hashed,
        role: 'ADMIN',
        school: school.name,
        isVerified: true,
      },
      select: { id: true, name: true, email: true },
    });
  }

  // ⛔ Suspend / reactivate a school admin (never touches SUPER_ADMIN)
  async toggleAdminSuspend(adminId: string, suspend: boolean) {
    const target = await prisma.user.findUnique({ where: { id: adminId } });
    if (!target || target.role !== 'ADMIN') throw new NotFoundException('Admin sekolah tidak ditemukan');
    return prisma.user.update({
      where: { id: adminId },
      data: { isSuspended: suspend },
      select: { id: true, name: true, isSuspended: true },
    });
  }
}