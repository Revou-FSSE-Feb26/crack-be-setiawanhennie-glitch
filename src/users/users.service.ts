import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class UsersService {
  async findAll() {
    return prisma.user.findMany({
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

  async updateRole(userId: string, newRole: Role) {
    if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(newRole)) {
      throw new BadRequestException('Role tidak valid');
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
    return user;
  }

  async toggleSuspend(userId: string, suspend: boolean) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: suspend },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
    return user;
  }
}