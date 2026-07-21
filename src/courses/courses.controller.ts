import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // GET /courses
  @Get()
  async getAllCourses() {
    return this.coursesService.findAll();
  }

  // POST /courses (Create a new course)
  @Post()
  async createCourse(@Body() body: any) {
    return this.coursesService.create(body);
  }

  // PUT /courses/:id (Update an existing course)
  @Put(':id')
  async updateCourse(@Param('id') id: string, @Body() body: any) {
    return this.coursesService.update(id, body);
  }

  // DELETE /courses/:id (Delete a course)
  @Delete(':id')
  async deleteCourse(@Param('id') id: string) {
    return this.coursesService.delete(id);
  }
}