import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SuperService } from './super.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('super')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperController {
  constructor(private readonly superService: SuperService) {}

  @Get('stats')
  getStats() {
    return this.superService.getStats();
  }

  @Get('schools')
  getSchools() {
    return this.superService.getSchools();
  }

  @Post('schools')
  onboard(@Body() body: any) {
    return this.superService.onboardSchool(body);
  }

  @Get('schools/:id/admins')
  getAdmins(@Param('id') id: string) {
    return this.superService.getSchoolAdmins(id);
  }

  @Post('schools/:id/admins')
  addAdmin(@Param('id') id: string, @Body() body: any) {
    return this.superService.addSchoolAdmin(id, body);
  }

  @Patch('admins/:id/suspend')
  suspend(@Param('id') id: string, @Body('suspend') suspend: boolean) {
    return this.superService.toggleAdminSuspend(id, suspend);
  }
}