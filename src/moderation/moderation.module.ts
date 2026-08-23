import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ModerationController, ReportsController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ModerationController, ReportsController],
  providers: [ModerationService],
})
export class ModerationModule {}