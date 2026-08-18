import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import { Resend } from 'resend'; 

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

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

    if (suspend) {
      try {
        await resend.emails.send({
          from: 'NusaSkillz <onboarding@resend.dev>',
          to: user.email,
          subject: '⚠️ Akun NusaSkillz Anda ditangguhkan',
          html: `
            <h2>Akun Anda ditangguhkan</h2>
            <p>Halo ${user.name},</p>
            <p>Akun NusaSkillz Anda telah ditangguhkan karena melanggar ketentuan platform.</p>
            <p>Jika Anda merasa ini sebuah kesalahan, balas email ini atau hubungi 
            <strong>support@nusaskillz.id</strong>.</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send suspension email:', emailError);
      }
    }

    return user;
  }

  async getStats() {
  const [totalStudents, totalTeachers, totalCourses, recentUsers] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.course.count(),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        role: true,
        school: true,
        createdAt: true,
      },
    }),
  ]);

  return { totalStudents, totalTeachers, totalCourses, recentUsers };
}
}