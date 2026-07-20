import { Controller, Get } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses') // This sets the URL to /courses
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get() // This handles GET requests
  async getAllCourses() {
    return this.coursesService.findAll();
  }
}