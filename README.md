# NusaSkillz Backend

Backend API for NusaSkillz, a gamified learning platform for students, teachers, schools, and administrators.

Built with NestJS, TypeScript, Prisma, PostgreSQL, Supabase, JWT authentication, and Resend email delivery.

## Features

- Student, teacher, admin, and super-admin roles
- Email verification and password reset flows
- Courses, lessons, progress tracking, and quizzes
- XP, levels, learning streaks, leaderboards, and badges
- Teacher course and lesson management
- School onboarding, join codes, classes, and assignments
- Content and user moderation reports
- Document text extraction and image uploads through Supabase Storage
- Contact and transactional email delivery through Resend

## Requirements

- Node.js 18 or newer
- PostgreSQL database
- npm
- Supabase project for storage features
- Resend account for verification, reset-password, contact, and moderation emails

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
JWT_SECRET="replace-with-a-long-random-secret"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx"

SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key"

# Optional: used in password-reset links
FRONTEND_URL="http://localhost:3000"

# Optional: custom sender address for password-reset emails
RESEND_FROM="NusaSkillz <onboarding@resend.dev>"
```

Never commit `.env` or expose `SUPABASE_SERVICE_KEY`, `DATABASE_URL`, `JWT_SECRET`, or `RESEND_API_KEY` in client-side code. Rotate any credentials that have already been shared publicly.

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Apply database migrations

For an existing migration history:

```bash
npx prisma migrate deploy
```

For local development when creating a new migration:

```bash
npx prisma migrate dev --name init
```

### 5. Seed demo data (optional)

```bash
npx prisma db seed
```

The seed script creates demo users, courses, lessons, badges, and progress records. Demo users use the password `password123`; email verification may still be required depending on the seeded record and login flow.

### 6. Start the development server

```bash
npm run start:dev
```

The API runs at `http://localhost:3001`.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start NestJS in watch mode |
| `npx prisma generate` | Generate the Prisma client |
| `npx prisma migrate dev --name <name>` | Create and apply a development migration |
| `npx prisma migrate deploy` | Apply committed migrations |
| `npx prisma db seed` | Seed the database |
| `npx prisma studio` | Open the Prisma data browser |

## API Overview

All routes are relative to `http://localhost:3001`. Protected routes require a JWT in the header:

```http
Authorization: Bearer <access_token>
```

| Area | Routes |
| --- | --- |
| Authentication | `POST /auth/register`, `/auth/verify`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` |
| Courses | `GET/POST /courses`, `PUT/DELETE /courses/:id` |
| Students | `GET /student/stats`, `GET /lessons/:id`, `POST /lessons/:id/complete` |
| Teacher dashboard | `GET /teacher/stats`, `/teacher/classes`, `/teacher/materials`, `/teacher/grading`, `/teacher/reports` |
| Teacher content | `POST /teacher/courses`, `POST /teacher/courses/:id/lessons`, `PATCH/DELETE /teacher/lessons/:id`, `PATCH /teacher/courses/:id/assignments` |
| Teacher uploads | `POST /teacher/extract`, `POST /teacher/upload` |
| Quizzes | `GET/POST /teacher/quizzes`, `PATCH/DELETE /teacher/quizzes/:id`, `GET /quizzes/:id`, `POST /quizzes/:id/submit`, `POST /quizzes/:id/check` |
| Schools | `GET /schools/join/:code`, `GET/PATCH /schools/me`, `POST /schools/me/regenerate-code` |
| Users | `GET /users`, `/users/stats`, `PATCH /users/:id/role`, `PATCH /users/:id/suspend` |
| Moderation | `POST /reports`, `GET /moderation/stats`, `/moderation/reports`, `/moderation/history`, `PATCH /moderation/reports/:id/resolve` |
| Super admin | `GET /super/stats`, `/super/schools`, `POST /super/schools`, and school-admin management routes |
| Contact | `POST /contact` |

Role restrictions are enforced by JWT and role guards where applicable. Public routes include registration, verification, login, password reset, course listing, school lookup by join code, and contact submission.

## Project Structure

```text
prisma/
  schema.prisma       Database schema
  seed.ts             Demo data seeder
src/
  auth/               Registration, verification, login, and password reset
  courses/            Public course CRUD
  student/            Student progress and dashboard features
  teacher/            Teacher dashboard, content, uploads, and quizzes
  school/             School profiles and join codes
  moderation/         Reports and moderation actions
  users/              Admin user management
  super/              Platform-level administration
  badges/             XP, streak, quiz, and lesson badge rules
  contact/            Contact form email delivery
  lib/                Prisma, Supabase, and auth helpers
```

## Database

The Prisma schema uses PostgreSQL and includes users, courses, lessons, progress, quizzes, questions, badges, reports, schools, and course assignments. Relations and cascade behavior are defined in `prisma/schema.prisma`.

## Development Notes

- The API enables CORS for frontend integration.
- JWTs expire after 7 days.
- Uploaded documents are limited to 10 MB; image uploads are limited to 5 MB.
- Email verification and password-reset tokens expire after 15 minutes.
- Keep role and school-scoping rules in sync when adding new protected endpoints.
