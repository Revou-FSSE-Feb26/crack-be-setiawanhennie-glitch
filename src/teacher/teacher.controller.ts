import { Controller, Get, Req, UseGuards, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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

    @Get('classes')
  getClasses(@Req() req: any) {
    return this.teacherService.getClasses(req.user.school);
  }

  @Get('materials')
  getMaterials() {
    return this.teacherService.getMaterials();
  }

  @Get('grading')
  getGrading(@Req() req: any) {
    return this.teacherService.getGrading(req.user.school);
  }

  @Get('reports')
  getReports(@Req() req: any) {
    return this.teacherService.getReports(req.user.school);
  }

  @Post('courses')
  createCourse(
    @Body() body: { title: string; description: string; emoji: string; color: string },
  ) {
    return this.teacherService.createCourse(body);
  }
  
  @Post('courses/:id/lessons')
  createLesson(
    @Param('id') id: string,
    @Body() body: { title: string; content: string },
  ) {
    return this.teacherService.createLesson(id, body);
  }

    // Upload & extract document text
  @Post('extract')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  extract(@UploadedFile() file: any) {
    return this.teacherService.extractText(file);
  }

  // View lesson
  @Get('lessons/:id')
  getLesson(@Param('id') id: string) {
    return this.teacherService.getLesson(id);
  }

  // Edit lesson
  @Patch('lessons/:id')
  updateLesson(@Param('id') id: string, @Body() body: { title?: string; content?: string }) {
    return this.teacherService.updateLesson(id, body);
  }

  // Delete lesson
  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) {
    return this.teacherService.deleteLesson(id);
  }

  // Image upload (for lessons, courses, etc.)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  upload(@UploadedFile() file: any) {
    return this.teacherService.uploadImage(file);
  }

  @Patch('courses/:id/assignments')
  updateAssignments(@Param('id') id: string, @Body('classes') classes: string[]) {
    return this.teacherService.updateAssignments(id, classes ?? []);
  }
}