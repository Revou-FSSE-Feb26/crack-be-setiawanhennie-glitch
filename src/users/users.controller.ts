import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  updateRole(@Param('id') id: string, @Body('role') role: 'STUDENT' | 'TEACHER' | 'ADMIN') {
    return this.usersService.updateRole(id, role);
  }

  @Patch(':id/suspend')
  @Roles('ADMIN')
  toggleSuspend(@Param('id') id: string, @Body('suspend') suspend: boolean) {
    return this.usersService.toggleSuspend(id, suspend);
  }

  @Get('stats')
  @Roles('ADMIN')
  getStats() {
    return this.usersService.getStats();
  }
}