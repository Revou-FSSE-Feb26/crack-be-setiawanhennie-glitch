import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class CoursesService {
  // This is the "Read" in CRUD
  async findAll() {
    return prisma.course.findMany();
  }
}