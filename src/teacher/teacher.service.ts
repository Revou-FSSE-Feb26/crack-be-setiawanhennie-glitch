import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { supabase } from '../lib/supabase';
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

    // 📚 Kelas Saya: students grouped by class
  async getClasses(school?: string) {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', ...(school ? { school } : {}) },
      select: { id: true, name: true, className: true, xp: true, level: true, isSuspended: true },
      orderBy: { name: 'asc' },
    });

    const map = new Map<string, typeof students>();
    for (const s of students) {
      const key = s.className || 'Tanpa Kelas';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }

    return Array.from(map.entries()).map(([className, list]) => ({
      className,
      count: list.length,
      avgXp: Math.round(list.reduce((a, b) => a + b.xp, 0) / list.length),
      students: list,
    }));
  }

  // 📖 Materi & Kuis: courses + their lessons
  async getMaterials() {
    return prisma.course.findMany({
      where: { isHidden: false },
      orderBy: { createdAt: 'asc' },
      include: { lessons: { select: { id: true, title: true } } },
    });
  }

  // ✅ Penilaian: latest graded attempts
  async getGrading(school?: string) {
    return prisma.progress.findMany({
      where: { completed: true, ...(school ? { user: { school } } : {}) },
      orderBy: { completedAt: 'desc' },
      take: 30,
      include: {
        user: { select: { name: true, className: true } },
        lesson: { select: { title: true } },
      },
    });
  }

  // 📊 Laporan: per-class performance
  async getReports(school?: string) {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', ...(school ? { school } : {}) },
      select: { id: true, className: true },
    });
    const progress = await prisma.progress.findMany({
      where: { completed: true, ...(school ? { user: { school } } : {}) },
      select: { userId: true, score: true },
    });

    const classOf = new Map(students.map((s) => [s.id, s.className || 'Tanpa Kelas']));
    const result = new Map<string, { students: number; completions: number; scores: number[] }>();

    for (const s of students) {
      const cls = s.className || 'Tanpa Kelas';
      if (!result.has(cls)) result.set(cls, { students: 0, completions: 0, scores: [] });
      result.get(cls)!.students++;
    }
    for (const p of progress) {
      const cls = classOf.get(p.userId);
      if (!cls) continue;
      const e = result.get(cls)!;
      e.completions++;
      if (p.score != null) e.scores.push(p.score);
    }

    return Array.from(result.entries()).map(([className, e]) => ({
      className,
      students: e.students,
      completions: e.completions,
      avgScore: e.scores.length
        ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length)
        : null,
    }));
  }

    // ➕ Create a new course
  async createCourse(data: { title: string; description: string; emoji: string; color: string }) {
    if (!data.title?.trim() || !data.description?.trim()) {
      throw new BadRequestException('Judul dan deskripsi wajib diisi');
    }
    const slug =
      data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString(36);

    return prisma.course.create({
      data: {
        title: data.title.trim(),
        description: data.description.trim(),
        emoji: data.emoji || '📚',
        color: data.color || 'bg-blue-500/10',
        slug,
      },
    });
  }

  // ➕ Add a lesson to a course
  async createLesson(courseId: string, data: { title: string; content: string }) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Kursus tidak ditemukan');
    if (!data.title?.trim() || !data.content?.trim()) {
      throw new BadRequestException('Judul dan isi pelajaran wajib diisi');
    }
    return prisma.lesson.create({
      data: {
        title: data.title.trim(),
        content: data.content.trim(),
        courseId,
      },
    }); 
  }

    // 📄 Extract text from uploaded document (file is NOT stored)
  async extractText(file: any): Promise<{ text: string }> {
    if (!file) throw new BadRequestException('Tidak ada file diunggah');
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();

    if (ext === 'txt' || ext === 'md') {
      return { text: file.buffer.toString('utf-8') };
    }

    if (ext === 'docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return { text: result.value };
    }

    if (ext === 'pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(file.buffer);
      return { text: data.text };
    }

    throw new BadRequestException('Format tidak didukung. Gunakan .pdf, .docx, .txt, atau .md');
  }

  // 👁️ View one lesson (with full content)
  async getLesson(id: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { course: { select: { title: true } } },
    });
    if (!lesson) throw new NotFoundException('Pelajaran tidak ditemukan');
    return lesson;
  }

  // ✏️ Edit a lesson
  async updateLesson(id: string, data: { title?: string; content?: string }) {
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Pelajaran tidak ditemukan');
    return prisma.lesson.update({
      where: { id },
      data: {
        title: data.title?.trim() || lesson.title,
        content: data.content?.trim() || lesson.content,
      },
    });
  }

  // 🗑️ Delete a lesson
  async deleteLesson(id: string) {
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Pelajaran tidak ditemukan');
    return prisma.lesson.delete({ where: { id } });
  }

    // 📷 Upload image to Supabase Storage, return public URL
  async uploadImage(file: any): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Tidak ada file diunggah');
    const ext = (file.originalname.split('.').pop() || 'png').toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      throw new BadRequestException('Format gambar tidak didukung (png/jpg/webp/gif)');
    }

    const path = `lessons/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('lesson-assets')
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (error) throw new BadRequestException('Gagal mengunggah gambar: ' + error.message);

    const { data } = supabase.storage.from('lesson-assets').getPublicUrl(path);
    return { url: data.publicUrl };
  }
}