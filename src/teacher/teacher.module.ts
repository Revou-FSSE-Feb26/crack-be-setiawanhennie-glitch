import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { TeacherQuizController, PlayQuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [TeacherController, TeacherQuizController, PlayQuizController],
  providers: [TeacherService, QuizService],
})
export class TeacherModule {}