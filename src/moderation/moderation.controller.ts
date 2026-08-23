import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

// Admin-only moderation endpoints
@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('stats')
  getStats() {
    return this.moderationService.getStats();
  }

  @Get('reports')
  getOpenReports() {
    return this.moderationService.getOpenReports();
  }

  @Get('history')
  getHistory() {
    return this.moderationService.getHistory();
  }

  @Patch('reports/:id/resolve')
  resolve(
    @Param('id') id: string,
    @Body('action') action: 'IGNORED' | 'CONTENT_HIDDEN' | 'USER_SUSPENDED',
  ) {
    return this.moderationService.resolveReport(id, action);
  }
}

// Any logged-in user can FILE a report
@Controller('reports')
export class ReportsController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: any,
    @Body() body: { targetType: string; targetId: string; reason: string; description?: string },
  ) {
    return this.moderationService.createReport({ reporterId: req.user.id, ...body });
  }
}