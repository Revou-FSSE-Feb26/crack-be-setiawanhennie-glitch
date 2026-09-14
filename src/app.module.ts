import { Module } from '@nestjs/common';
import { CoursesModule } from './courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { ContactModule } from './contact/contact.module';
import { UsersModule } from './users/users.module';
import { ModerationModule } from './moderation/moderation.module';
import { TeacherModule } from './teacher/teacher.module';
import { StudentModule } from './student/student.module';
import { SchoolModule } from './school/school.module';
import { SuperModule } from './super/super.module';

@Module({
  imports: [CoursesModule, AuthModule, ContactModule, UsersModule, ModerationModule, TeacherModule, StudentModule, SchoolModule, SuperModule],
})
export class AppModule {}