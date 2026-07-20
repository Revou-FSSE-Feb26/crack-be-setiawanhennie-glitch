import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS so your Next.js frontend (port 3000) can talk to this backend (port 3001)
  app.enableCors(); 
  
  await app.listen(3001);
  console.log('🚀 Backend running on http://localhost:3001');
}
bootstrap();