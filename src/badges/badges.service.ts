import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🏅 All badge definitions — rules evaluated against player stats
export const BADGES = [
  { slug: 'langkah-pertama', name: 'Langkah Pertama', icon: '🌱', description: 'Selesaikan pelajaran pertamamu', check: (s: any) => s.completedLessons >= 1 },
  { slug: 'rajin-belajar', name: 'Rajin Belajar', icon: '📚', description: 'Selesaikan 10 pelajaran', check: (s: any) => s.completedLessons >= 10 },
  { slug: 'kuis-perdana', name: 'Kuis Perdana', icon: '🎯', description: 'Selesaikan kuis pertamamu', check: (s: any) => s.quizzesTaken >= 1 },
  { slug: 'kuis-sempurna', name: 'Kuis Sempurna', icon: '💯', description: 'Raih skor 100 pada sebuah kuis', check: (s: any) => s.hadPerfectQuiz },
  { slug: 'combo-x5', name: 'Combo x5', icon: '🔥', description: '5 jawaban benar beruntun dalam satu kuis', check: (s: any) => s.bestQuizStreak >= 5 },
  { slug: 'streak-3', name: 'Setia 3 Hari', icon: '⚡', description: 'Jaga streak 3 hari berturut-turut', check: (s: any) => s.streak >= 3 },
  { slug: 'streak-7', name: 'Seminggu Membara', icon: '🌟', description: 'Jaga streak 7 hari berturut-turut', check: (s: any) => s.streak >= 7 },
  { slug: 'level-5', name: 'Petualang Level 5', icon: '🚀', description: 'Capai level 5', check: (s: any) => s.level >= 5 },
  { slug: 'kolektor-xp', name: 'Kolektor XP', icon: '💎', description: 'Kumpulkan total 1000 XP', check: (s: any) => s.xp >= 1000 },
];

@Injectable()
export class BadgeService {
  // Update daily streak: new day → +1, missed days → reset to 1, same day → keep
  private async refreshStreak(user: any): Promise<number> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const last = user.lastActiveAt ? new Date(user.lastActiveAt) : null;

    let streak = user.streak;
    if (!last || last < startOfYesterday) streak = 1;
    else if (last < startOfToday) streak = user.streak + 1;
    // same day → unchanged

    await prisma.user.update({ where: { id: user.id }, data: { streak, lastActiveAt: now } });
    return streak;
  }

  // Evaluate all rules; award newly-earned badges; return them for the celebration UI
  async evaluate(userId: string, event?: { score?: number; maxStreak?: number }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    const streak = await this.refreshStreak(user);

    const [completedLessons, quizzesTaken, perfectCount] = await Promise.all([
      prisma.progress.count({ where: { userId, completed: true } }),
      prisma.progress.count({ where: { userId, score: { not: null } } }),
      prisma.progress.count({ where: { userId, score: 100 } }),
    ]);

    const stats = {
      xp: user.xp,
      level: user.level,
      streak,
      completedLessons,
      quizzesTaken,
      hadPerfectQuiz: perfectCount > 0 || event?.score === 100,
      bestQuizStreak: event?.maxStreak ?? 0,
    };

    const newlyEarned: { slug: string; name: string; icon: string }[] = [];

    for (const def of BADGES) {
      if (!def.check(stats)) continue;

      // Auto-create the badge definition if it doesn't exist yet
      const badge = await prisma.badge.upsert({
        where: { slug: def.slug },
        update: {},
        create: { slug: def.slug, name: def.name, icon: def.icon, description: def.description },
      });

      // Idempotent award (unique [userId, badgeId])
      const existing = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      });
      if (!existing) {
        await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
        newlyEarned.push({ slug: def.slug, name: def.name, icon: def.icon });
      }
    }

    return newlyEarned;
  }
}