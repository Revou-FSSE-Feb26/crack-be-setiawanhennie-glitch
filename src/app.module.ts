import { Module } from '@nestjs/common';
import { CoursesModule } from './courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { ContactModule } from './contact/contact.module';
import { UsersModule } from './users/users.module';
import { ModerationModule } from './moderation/moderation.module';
import { TeacherModule } from './teacher/teacher.module';
import { StudentModule } from './student/student.module';

@Module({
  imports: [CoursesModule, AuthModule, ContactModule, UsersModule, ModerationModule, TeacherModule, StudentModule],
})
export class AppModule {}