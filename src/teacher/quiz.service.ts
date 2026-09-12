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
      pairs?: { left: string; right: string }[]; 
    }[];
  }) {
    if (!data.title?.trim()) throw new BadRequestException('Judul kuis wajib diisi');
    if (!data.questions?.length) throw new BadRequestException('Kuis butuh minimal 1 pertanyaan');

    for (const q of data.questions) {
      if (!q.prompt?.trim()) throw new BadRequestException('Setiap pertanyaan wajib punya soal');

      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
        if (!q.options || q.options.length < 2) throw new BadRequestException('Pilihan ganda butuh minimal 2 opsi');
        if (!q.options.includes(q.answer)) throw new BadRequestException('Jawaban benar harus salah satu opsi');
      }
      if (q.type === 'FILL_BLANK' || q.type === 'WORD_SCRAMBLE') {
        if (!q.answer?.trim()) throw new BadRequestException('Jawaban wajib diisi');
      }
      if (q.type === 'ORDERING') {
        if (!q.options || q.options.length < 3) throw new BadRequestException('Urutkan butuh minimal 3 item');
      }
      if (q.type === 'MATCHING') {
        const pairs = q.pairs as { left: string; right: string }[] | undefined;
        if (!pairs || pairs.length < 2 || pairs.some((p) => !p.left?.trim() || !p.right?.trim())) {
          throw new BadRequestException('Menjodohkan butuh minimal 2 pasangan lengkap');
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
            options: (q.options ?? []).map((o) => String(o).trim()).filter(Boolean),
            answer: (q.answer ?? '').trim(),
            pairs: q.type === 'MATCHING' ? (q.pairs as any) : undefined,
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

  async getQuizForPlay(id: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          select: { id: true, type: true, prompt: true, options: true, points: true, order: true, pairs: true },
          orderBy: { order: 'asc' },
        },
        lesson: { select: { title: true } },
      },
    });
    if (!quiz) throw new NotFoundException('Kuis tidak ditemukan');

    quiz.questions = quiz.questions.map((q: any) => {
      if (q.type === 'WORD_SCRAMBLE') {
        const letters = q.answer.replace(/\s+/g, '').split('');
        const scrambled = [...letters];
        for (let i = scrambled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
        }
        if (scrambled.join('') === letters.join('')) scrambled.reverse();
        return { ...q, scrambled: scrambled.join(' ') }; 
      }
      return q;
    });

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
        let isCorrect = false;
        let displayAnswer = q.answer;

        if (q.type === 'FILL_BLANK' || q.type === 'WORD_SCRAMBLE') {
          isCorrect = given.trim() !== '' && normalize(given) === normalize(q.answer);
        } else if (q.type === 'ORDERING') {
          displayAnswer = q.options.join(' → ');
          try {
            isCorrect = Array.isArray(JSON.parse(given)) && JSON.parse(given).join('|') === q.options.join('|');
          } catch { isCorrect = false; }
        } else if (q.type === 'MATCHING') {
          const correct = (q.pairs as any[]).map((p) => p.right);
          displayAnswer = (q.pairs as any[]).map((p) => `${p.left} = ${p.right}`).join(', ');
          try {
            isCorrect = Array.isArray(JSON.parse(given)) && JSON.parse(given).join('|') === correct.join('|');
          } catch { isCorrect = false; }
        } else {
          isCorrect = given.trim() === q.answer;
        }

        if (isCorrect) {
          correct++;
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          streak = 0;
        }
        return { questionId: q.id, correct: isCorrect, correctAnswer: displayAnswer };
      });

    const total = quiz.questions.length;
    const score = Math.round((correct / total) * 100);
    const xpEarned =
      Math.round(quiz.xpReward * (correct / total)) + Math.max(0, maxStreak - 1) * 5;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: xpEarned } },
    });
    
    const newLevel = Math.floor(updatedUser.xp / 500) + 1;
    if (newLevel !== updatedUser.level) {
      await prisma.user.update({ 
        where: { id: userId }, 
        data: { level: newLevel } 
      });
    }

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

    // Grade a single question (used by the live "Periksa" button)
  private gradeOne(q: any, given: string): { correct: boolean; displayAnswer: string } {
    if (q.type === 'FILL_BLANK' || q.type === 'WORD_SCRAMBLE') {
      return {
        correct: given.trim() !== '' && normalize(given) === normalize(q.answer),
        displayAnswer: q.answer,
      };
    }
    if (q.type === 'ORDERING') {
      let correct = false;
      try {
        correct = Array.isArray(JSON.parse(given)) && JSON.parse(given).join('|') === q.options.join('|');
      } catch {}
      return { correct, displayAnswer: q.options.join(' → ') };
    }
    if (q.type === 'MATCHING') {
      const rights = (q.pairs as any[]).map((p) => p.right);
      let correct = false;
      try {
        correct = Array.isArray(JSON.parse(given)) && JSON.parse(given).join('|') === rights.join('|');
      } catch {}
      return { correct, displayAnswer: (q.pairs as any[]).map((p) => `${p.left} = ${p.right}`).join(', ') };
    }
    return { correct: given.trim() === q.answer, displayAnswer: q.answer };
  }

  async checkAnswer(quizId: string, questionId: string, given: string) {
    const q = await prisma.question.findUnique({ where: { id: questionId } });
    if (!q || q.quizId !== quizId) throw new NotFoundException('Pertanyaan tidak ditemukan');
    return this.gradeOne(q, given ?? '');
  }
}