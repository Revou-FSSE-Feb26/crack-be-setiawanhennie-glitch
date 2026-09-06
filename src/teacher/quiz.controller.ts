import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
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
  create(@Body() body: any) {
    return this.quizService.createQuiz(body);
  }

  @Get()
  list(@Query('lessonId') lessonId?: string) {
    return this.quizService.listQuizzes(lessonId);
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
}