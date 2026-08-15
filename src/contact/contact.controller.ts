import { Controller, Post, Body } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async submit(@Body() body: { name: string; email: string; topic: string; message: string }) {
    return this.contactService.sendInquiry(body);
  }
}