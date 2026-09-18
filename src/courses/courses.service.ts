import { Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma';

@Injectable()
export class CoursesService {
  async findAll() {
    return prisma.course.findMany({
      where: { isHidden: false },
      include: { lessons: true },
    });
  }

  async create(data: any) {
    return prisma.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        emoji: data.emoji,
        color: data.color,
        isLocked: data.isLocked || false,
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.course.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
      },
    });
  }

  async delete(id: string) {
    return prisma.course.delete({
      where: { id },
    });
  }
}