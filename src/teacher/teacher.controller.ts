import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER', 'ADMIN')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('stats')
  getStats(@Req() req: any) {
    return this.teacherService.getStats(req.user.school);
  }
}