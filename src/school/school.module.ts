import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SchoolController],
  providers: [SchoolService],
})
export class SchoolModule {}