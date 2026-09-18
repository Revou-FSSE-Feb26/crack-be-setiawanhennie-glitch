import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async getAllCourses() {
    return this.coursesService.findAll();
  }

  @Post()
  async createCourse(@Body() body: any) {
    return this.coursesService.create(body);
  }

  @Put(':id')
  async updateCourse(@Param('id') id: string, @Body() body: any) {
    return this.coursesService.update(id, body);
  }

  @Delete(':id')
  async deleteCourse(@Param('id') id: string) {
    return this.coursesService.delete(id);
  }
}