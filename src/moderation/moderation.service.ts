import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

@Injectable()
export class ModerationService {
  // Stats for the top cards
  async getStats() {
    const [open, resolvedWeek, hidden, suspended] = await Promise.all([
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.report.count({
        where: {
          status: 'RESOLVED',
          resolvedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.course.count({ where: { isHidden: true } }),
      prisma.user.count({ where: { isSuspended: true } }),
    ]);
    return { open, resolvedWeek, hidden, suspended };
  }

  // Attach readable names to each report (reporter + target)
  private async enrich(report: any) {
    const reporter = await prisma.user.findUnique({
      where: { id: report.reporterId },
      select: { name: true },
    });

    let targetName = '(tidak ditemukan)';
    if (report.targetType === 'CONTENT') {
      targetName =
        (await prisma.course.findUnique({ where: { id: report.targetId }, select: { title: true } }))?.title ??
        targetName;
    } else {
      targetName =
        (await prisma.user.findUnique({ where: { id: report.targetId }, select: { name: true } }))?.name ??
        targetName;
    }

    return { ...report, reporterName: reporter?.name ?? 'Anonim', targetName };
  }

  // Tab 1: open reports
  async getOpenReports() {
    const reports = await prisma.report.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(reports.map((r) => this.enrich(r)));
  }

  // Tab 2: audit history
  async getHistory() {
    const reports = await prisma.report.findMany({
      where: { status: { in: ['RESOLVED', 'DISMISSED'] } },
      orderBy: { resolvedAt: 'desc' },
    });
    return Promise.all(reports.map((r) => this.enrich(r)));
  }

  // Apply an admin action & close the report
  async resolveReport(reportId: string, action: 'IGNORED' | 'CONTENT_HIDDEN' | 'USER_SUSPENDED') {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Laporan tidak ditemukan');
    if (report.status !== 'OPEN') throw new BadRequestException('Laporan sudah diselesaikan');

    if (action === 'CONTENT_HIDDEN') {
      if (report.targetType !== 'CONTENT') throw new BadRequestException('Laporan ini bukan tentang konten');
      const course = await prisma.course.findUnique({ where: { id: report.targetId } });
      if (!course) throw new NotFoundException('Konten tidak ditemukan');
      await prisma.course.update({ where: { id: report.targetId }, data: { isHidden: true } });
    }

    if (action === 'USER_SUSPENDED') {
      if (report.targetType !== 'USER') throw new BadRequestException('Laporan ini bukan tentang pengguna');
      const target = await prisma.user.findUnique({ where: { id: report.targetId } });
      if (!target) throw new NotFoundException('Pengguna tidak ditemukan');
      await prisma.user.update({ where: { id: report.targetId }, data: { isSuspended: true } });

      // Notify the suspended user by email
      await resend.emails.send({
        from: 'NusaSkillz <onboarding@resend.dev>',
        to: target.email,
        subject: '⚠️ Akun NusaSkillz Anda ditangguhkan',
        html: `<h2>Akun Anda ditangguhkan</h2><p>Halo ${target.name}, akun Anda ditangguhkan setelah tinjauan laporan. Hubungi support@nusaskillz.id untuk informasi lebih lanjut.</p>`,
      });
    }

    return prisma.report.update({
      where: { id: reportId },
      data: {
        status: action === 'IGNORED' ? 'DISMISSED' : 'RESOLVED',
        actionTaken: action,
        resolvedAt: new Date(),
      },
    });
  }

  // File a new report (any logged-in user)
  async createReport(data: {
    reporterId: string;
    targetType: string;
    targetId: string;
    reason: string;
    description?: string;
  }) {
    if (!['CONTENT', 'USER'].includes(data.targetType)) {
      throw new BadRequestException('targetType tidak valid');
    }
    return prisma.report.create({ data });
  }
}