import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
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

  @Get('lessons/:id')
  getLesson(@Param('id') id: string) {
    return this.studentService.getLesson(id);
  }
}