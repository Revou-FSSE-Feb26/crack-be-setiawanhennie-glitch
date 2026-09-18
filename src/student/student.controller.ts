import { Controller, Get, Param, Req, UseGuards, Post } from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('student/stats')
  getStats(@Req() req: any) {
    return this.studentService.getStats(req.user.id);
  }

  @Post('lessons/:id/complete')
  completeLesson(@Param('id') id: string, @Req() req: any) {
    return this.studentService.completeLesson(id, req.user.id);
  }

  @Get('lessons/:id')
  getLesson(@Param('id') id: string, @Req() req: any) {
    return this.studentService.getLesson(id, req.user.id);
  }
}