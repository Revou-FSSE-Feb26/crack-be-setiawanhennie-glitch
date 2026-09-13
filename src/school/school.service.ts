import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export function generateSchoolCode(name?: string): string {
  const prefix =
    (name || 'SCH').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SCH';
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

@Injectable()
export class SchoolService {
  // Signup page looks the school up by code
  async findByCode(code: string) {
    const school = await prisma.school.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!school) throw new NotFoundException('Kode sekolah tidak ditemukan');
    return { name: school.name, address: school.address, classList: school.classList };
  }

  // Own school profile (matched via admin's school name)
  async getMine(schoolName: string) {
    const school = await prisma.school.findUnique({ where: { name: schoolName } });
    if (!school) throw new NotFoundException('Sekolah belum terdaftar di sistem');
    return school;
  }

  async updateMine(
    schoolName: string,
    data: { address?: string; principal?: string; contactEmail?: string; classList?: string[] },
  ) {
    const school = await prisma.school.findUnique({ where: { name: schoolName } });
    if (!school) throw new NotFoundException('Sekolah belum terdaftar di sistem');
    return prisma.school.update({
      where: { id: school.id },
      data: {
        address: data.address,
        principal: data.principal,
        contactEmail: data.contactEmail,
        classList: data.classList,
      },
    });
  }

  async regenerateCode(schoolName: string) {
    const school = await prisma.school.findUnique({ where: { name: schoolName } });
    if (!school) throw new NotFoundException('Sekolah belum terdaftar di sistem');
    return prisma.school.update({
      where: { id: school.id },
      data: { code: generateSchoolCode(school.name) },
    });
  }
}