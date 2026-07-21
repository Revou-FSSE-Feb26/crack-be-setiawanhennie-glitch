import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class CoursesService {
  // READ (Already done)
  async findAll() {
    return prisma.course.findMany({
      include: { lessons: true },
    });
  }

  // CREATE
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

  // UPDATE
  async update(id: string, data: any) {
    return prisma.course.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        // Add other fields you want to allow updating
      },
    });
  }

  // DELETE
  async delete(id: string) {
    return prisma.course.delete({
      where: { id },
    });
  }
}