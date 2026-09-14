import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SuperController } from './super.controller';
import { SuperService } from './super.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SuperController],
  providers: [SuperService],
})
export class SuperModule {}