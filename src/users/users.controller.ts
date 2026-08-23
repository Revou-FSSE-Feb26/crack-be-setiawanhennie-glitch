import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  @Roles('ADMIN')
  getStats(@Req() req: any) {
    return this.usersService.getStats(req.user.school);
  }

  @Get()
  @Roles('ADMIN')
  findAll(@Req() req: any) {
    return this.usersService.findAll(req.user.school);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  updateRole(
    @Param('id') id: string,
    @Body('role') role: 'STUDENT' | 'TEACHER' | 'ADMIN',
    @Req() req: any,
  ) {
    return this.usersService.updateRole(id, role, req.user.school);
  }

  @Patch(':id/suspend')
  @Roles('ADMIN')
  toggleSuspend(@Param('id') id: string, @Body('suspend') suspend: boolean, @Req() req: any) {
    return this.usersService.toggleSuspend(id, suspend, req.user.school, req.user.id);
  }
}