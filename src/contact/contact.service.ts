import { Injectable, BadRequestException } from '@nestjs/common';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

@Injectable()
export class ContactService {
  async sendInquiry(data: { name: string; email: string; topic: string; message: string }) {
    if (!data.name || !data.email || !data.message) {
      throw new BadRequestException('Semua field wajib diisi');
    }

    await resend.emails.send({
      from: 'NusaSkillz <onboarding@resend.dev>',
      to: 'setiawanhennie@gmail.com',
      subject: `[${data.topic}] Pesan baru dari ${data.name}`,
      html: `
        <h2>📩 Inquiry Baru dari Website</h2>
        <p><strong>Nama:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Topik:</strong> ${data.topic}</p>
        <p><strong>Pesan:</strong></p>
        <p>${data.message}</p>
      `,
    });

    return { message: 'Pesan berhasil dikirim' };
  }
}