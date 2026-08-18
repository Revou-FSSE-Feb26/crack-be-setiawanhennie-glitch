import { Module } from '@nestjs/common';
import { CoursesModule } from './courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { ContactModule } from './contact/contact.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [CoursesModule, AuthModule, ContactModule, UsersModule],
})
export class AppModule {}