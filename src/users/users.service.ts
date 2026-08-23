import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class UsersService {
  // Only users from the admin's school
  async findAll(school?: string) {
    return prisma.user.findMany({
      where: school ? { school } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        school: true,
        className: true,
        isSuspended: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // School-scoped stats + class distribution (for the future dashboard)
  async getStats(school?: string) {
    const scope = school ? { school } : {};

    const [totalStudents, totalTeachers, recentUsers, classDistribution] = await Promise.all([
      prisma.user.count({ where: { ...scope, role: 'STUDENT' } }),
      prisma.user.count({ where: { ...scope, role: 'TEACHER' } }),
      prisma.user.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, role: true, school: true, createdAt: true },
      }),
      prisma.user.groupBy({
        by: ['className'],
        where: { ...scope, role: 'STUDENT', className: { not: null } },
        _count: { _all: true },
        orderBy: { className: 'asc' },
      }),
    ]);

    return { totalStudents, totalTeachers, recentUsers, classDistribution };
  }

  // School admin can NOT create admins, and can't touch other schools
  async updateRole(userId: string, newRole: Role, adminSchool?: string) {
    if (newRole === 'ADMIN') {
      throw new BadRequestException('Admin sekolah tidak dapat membuat admin baru');
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Pengguna tidak ditemukan');
    if (adminSchool && target.school !== adminSchool) {
      throw new ForbiddenException('Pengguna berada di luar sekolah Anda');
    }
    return prisma.user.update({ where: { id: userId }, data: { role: newRole } });
  }

  // Scoped suspend + can't suspend yourself
  async toggleSuspend(userId: string, suspend: boolean, adminSchool?: string, adminId?: string) {
    if (userId === adminId) {
      throw new BadRequestException('Tidak dapat menangguhkan diri sendiri');
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Pengguna tidak ditemukan');
    if (adminSchool && target.school !== adminSchool) {
      throw new ForbiddenException('Pengguna berada di luar sekolah Anda');
    }
    return prisma.user.update({ where: { id: userId }, data: { isSuspended: suspend } });
  }
}