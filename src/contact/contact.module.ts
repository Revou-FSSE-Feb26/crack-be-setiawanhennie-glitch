import { ContactModule } from './contact/contact.module';

@Module({
  imports: [CoursesModule, AuthModule, ContactModule],
})
export class AppModule {}