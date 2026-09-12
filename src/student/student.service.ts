import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class StudentService {
  async getStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, xp: true, level: true, streak: true, school: true, className: true },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');

    const [progressRows, totalLessons, badges, courses, leaderboard] = await Promise.all([
      prisma.progress.findMany({
        where: { userId, completed: true },
        select: { lessonId: true },
      }),
      prisma.lesson.count(),
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: { select: { name: true, icon: true } } },
      }),
      prisma.course.findMany({
        where: { isHidden: false },
        include: { lessons: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.findMany({
        where: { role: 'STUDENT', ...(user.school ? { school: user.school } : {}) },
        orderBy: { xp: 'desc' },
        take: 5,
        select: { id: true, name: true, xp: true },
      }),
    ]);

    const completedIds = new Set(progressRows.map((p) => p.lessonId));

    const coursesOut = courses.map((c) => {
      const done = c.lessons.filter((l) => completedIds.has(l.id)).length;
      const next = c.lessons.find((l) => !completedIds.has(l.id));
      return {
        id: c.id,
        title: c.title,
        emoji: c.emoji,
        color: c.color,
        isLocked: c.isLocked,
        total: c.lessons.length,
        done,
        nextLesson: next?.title ?? null,
        nextLessonId: next?.id ?? null,
        firstLessonId: c.lessons[0]?.id ?? null,
      };
    });

    return {
      user,
      xpToNext: (user.level + 1) * 500,
      completedLessons: completedIds.size,
      totalLessons,
      badges: badges.map((b) => ({ name: b.badge.name, icon: b.badge.icon })),
      courses: coursesOut,
      leaderboard: leaderboard.map((u, i) => ({
        rank: i + 1,
        name: u.name,
        xp: u.xp,
        isUser: u.id === userId,
      })),
    };
  }

  // Lesson content + its attached quiz (for the player page)
  async getLesson(lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: { select: { title: true, emoji: true } },
        quizzes: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            timeLimit: true,
            lives: true,
            xpReward: true,
            _count: { select: { questions: true } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Pelajaran tidak ditemukan');
    return lesson;
  }

  async completeLesson(lessonId: string, userId: string) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Pelajaran tidak ditemukan');
    return prisma.progress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completed: true, completedAt: new Date() },
      create: { userId, lessonId, completed: true, completedAt: new Date() },
    });
  }
}