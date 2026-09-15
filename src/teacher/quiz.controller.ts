import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards, Patch } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

// Teacher-only: manage quizzes
@Controller('teacher/quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER', 'ADMIN')
export class TeacherQuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.quizService.createQuiz({ ...body, school: req.user.school });
  }

  @Get()
  list(@Req() req: any, @Query('lessonId') lessonId?: string) {
    return this.quizService.listQuizzes(lessonId, req.user.school);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quizService.deleteQuiz(id);
  }
}

// Any logged-in user: play quizzes
@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class PlayQuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get(':id')
  getForPlay(@Param('id') id: string) {
    return this.quizService.getQuizForPlay(id);
  }

  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Req() req: any,
    @Body('answers') answers: { questionId: string; answer: string }[],
  ) {
    return this.quizService.submitQuiz(id, req.user.id, answers);
  }

  @Post(':id/check')
  check(@Param('id') id: string, @Body() body: { questionId: string; answer: string }) {
    return this.quizService.checkAnswer(id, body.questionId, body.answer);
  }

  @Get(':id')
  getForEdit(@Req() req: any, @Param('id') id: string) {
    return this.quizService.getQuizForEdit(id, req.user.school);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.quizService.updateQuiz(id, body, req.user.school);
  }
}