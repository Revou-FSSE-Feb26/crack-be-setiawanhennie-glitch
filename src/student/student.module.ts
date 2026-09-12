import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}