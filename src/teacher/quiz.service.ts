import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

@Injectable()
export class QuizService {
  async createQuiz(data: {
    title: string;
    lessonId?: string;
    timeLimit?: number | null;
    lives?: number | null;
    xpReward?: number;
    questions: {
      type: QuestionType;
      prompt: string;
      options?: string[];
      answer: string;
      points?: number;
    }[];
  }) {
    if (!data.title?.trim()) throw new BadRequestException('Judul kuis wajib diisi');
    if (!data.questions?.length) throw new BadRequestException('Kuis butuh minimal 1 pertanyaan');

    for (const q of data.questions) {
      if (!q.prompt?.trim() || !q.answer?.trim()) {
        throw new BadRequestException('Setiap pertanyaan wajib punya soal dan jawaban');
      }
      if (q.type !== 'FILL_BLANK') {
        if (!q.options || q.options.length < 2) {
          throw new BadRequestException('Pilihan ganda / benar-salah butuh minimal 2 opsi');
        }
        if (!q.options.includes(q.answer)) {
          throw new BadRequestException('Jawaban benar harus salah satu dari opsi');
        }
      }
    }

    return prisma.quiz.create({
      data: {
        title: data.title.trim(),
        lessonId: data.lessonId || null,
        timeLimit: data.timeLimit ?? null,
        lives: data.lives ?? null,
        xpReward: data.xpReward ?? 50,
        questions: {
          create: data.questions.map((q, i) => ({
            type: q.type,
            prompt: q.prompt.trim(),
            options: q.type === 'FILL_BLANK' ? [] : q.options!.map((o) => o.trim()),
            answer: q.answer.trim(),
            points: q.points ?? 10,
            order: i,
          })),
        },
      },
      include: { questions: true },
    });
  }

  async listQuizzes(lessonId?: string) {
    return prisma.quiz.findMany({
      where: lessonId ? { lessonId } : undefined,
      include: {
        _count: { select: { questions: true } },
        lesson: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteQuiz(id: string) {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Kuis tidak ditemukan');
    return prisma.quiz.delete({ where: { id } });
  }

  // 🎮 Student fetches a quiz — answers are NEVER sent to the client
  async getQuizForPlay(id: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          select: { id: true, type: true, prompt: true, options: true, points: true, order: true },
          orderBy: { order: 'asc' },
        },
        lesson: { select: { title: true } },
      },
    });
    if (!quiz) throw new NotFoundException('Kuis tidak ditemukan');
    return quiz;
  }

  // ✅ Grade submission, award XP + streak bonus, update Progress
  async submitQuiz(
    quizId: string,
    userId: string,
    answers: { questionId: string; answer: string }[],
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });
    if (!quiz) throw new NotFoundException('Kuis tidak ditemukan');

    const answerMap = new Map((answers || []).map((a) => [a.questionId, a.answer ?? '']));
    let correct = 0;
    let streak = 0;
    let maxStreak = 0;

    const results = quiz.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const given = answerMap.get(q.id) ?? '';
        const isCorrect =
          q.type === 'FILL_BLANK'
            ? given.trim() !== '' && normalize(given) === normalize(q.answer)
            : given.trim() === q.answer;
        if (isCorrect) {
          correct++;
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          streak = 0;
        }
        return { questionId: q.id, correct: isCorrect, correctAnswer: q.answer };
      });

    const total = quiz.questions.length;
    const score = Math.round((correct / total) * 100);
    // XP = scaled reward + 5 bonus per consecutive correct after the first 🔥
    const xpEarned =
      Math.round(quiz.xpReward * (correct / total)) + Math.max(0, maxStreak - 1) * 5;

    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: xpEarned } },
    });

    if (quiz.lessonId) {
      await prisma.progress.upsert({
        where: { userId_lessonId: { userId, lessonId: quiz.lessonId } },
        update: { completed: true, score, completedAt: new Date() },
        create: {
          userId,
          lessonId: quiz.lessonId,
          completed: true,
          score,
          completedAt: new Date(),
        },
      });
    }

    return { correct, total, score, xpEarned, maxStreak, results };
  }
}