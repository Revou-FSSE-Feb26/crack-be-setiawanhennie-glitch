import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class TeacherService {
  async getStats(school?: string) {
    const scope = school ? { school } : {};
    const activityScope = school ? { user: { school } } : {};

    const [totalStudents, classGroups, totalCourses, avg, recentProgress, topStudents] =
      await Promise.all([
        prisma.user.count({ where: { ...scope, role: 'STUDENT' } }),
        prisma.user.groupBy({
          by: ['className'],
          where: { ...scope, role: 'STUDENT', className: { not: null } },
          _count: { _all: true },
        }),
        prisma.course.count({ where: { isHidden: false } }),
        prisma.progress.aggregate({ where: activityScope, _avg: { score: true } }),
        prisma.progress.findMany({
          where: { completed: true, completedAt: { not: null }, ...activityScope },
          orderBy: { completedAt: 'desc' },
          take: 5,
          include: {
            user: { select: { name: true } },
            lesson: { select: { title: true } },
          },
        }),
        prisma.user.findMany({
          where: { ...scope, role: 'STUDENT' },
          orderBy: { xp: 'desc' },
          take: 3,
          select: { id: true, name: true, xp: true, level: true },
        }),
      ]);

    return {
      totalStudents,
      activeClasses: classGroups.length,
      totalCourses,
      averageScore: avg._avg.score ? Math.round(avg._avg.score * 10) / 10 : null,
      recentActivity: recentProgress.map((p) => ({
        id: p.id,
        userName: p.user.name,
        lessonTitle: p.lesson.title,
        score: p.score,
        completedAt: p.completedAt,
      })),
      topStudents,
    };
  }
}