import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SchoolService } from './school.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('schools')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Get('join/:code')
  findByCode(@Param('code') code: string) {
    return this.schoolService.findByCode(code);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getMine(@Req() req: any) {
    return this.schoolService.getMine(req.user.school);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateMine(@Req() req: any, @Body() body: any) {
    return this.schoolService.updateMine(req.user.school, body);
  }

  @Post('me/regenerate-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  regenerate(@Req() req: any) {
    return this.schoolService.regenerateCode(req.user.school);
  }
}