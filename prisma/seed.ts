import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log(' Seeding database...')

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash('password123', 10)

  // 1. Create Users
  const student1 = await prisma.user.upsert({
    where: { email: 'budi@student.com' },
    update: {},
    create: {
      name: 'Budi Santoso',
      email: 'budi@student.com',
      password: hashedPassword,
      role: 'STUDENT',
      xp: 1250,
      level: 5,
      streak: 7,
    },
  })

  const student2 = await prisma.user.upsert({
    where: { email: 'siti@student.com' },
    update: {},
    create: {
      name: 'Siti Aminah',
      email: 'siti@student.com',
      password: hashedPassword,
      role: 'STUDENT',
      xp: 2500,
      level: 8,
      streak: 15,
    },
  })

  const teacher1 = await prisma.user.upsert({
    where: { email: 'pak.joko@teacher.com' },
    update: {},
    create: {
      name: 'Pak Joko',
      email: 'pak.joko@teacher.com',
      password: hashedPassword,
      role: 'TEACHER',
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nusaskillz.com' },
    update: {},
    create: {
      name: 'Pak Admin',
      email: 'admin@nusaskillz.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log('✅ Users created')

  // 2. Create Courses
  const mathCourse = await prisma.course.create({
    data: {
      title: 'Matematika',
      slug: 'matematika',
      description: 'Kuasai angka, aljabar, dan geometri dari dasar hingga mahir.',
      emoji: '🔢',
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      isLocked: false,
    },
  })

  const scienceCourse = await prisma.course.create({
    data: {
      title: 'Sains & IPA',
      slug: 'sains',
      description: 'Jelajahi biologi, fisika, dan kimia melalui eksperimen virtual.',
      emoji: '🔬',
      color: 'bg-green-500/10 text-green-600 border-green-500/20',
      isLocked: false,
    },
  })

  const languageCourse = await prisma.course.create({
    data: {
      title: 'Bahasa & Sastra',
      slug: 'bahasa',
      description: 'Tingkatkan kemampuan membaca, menulis, dan bedah karya sastra.',
      emoji: '📚',
      color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      isLocked: false,
    },
  })

  const historyCourse = await prisma.course.create({
    data: {
      title: 'Sejarah & Sosial',
      slug: 'sejarah',
      description: 'Telusuri perjalanan peradaban manusia dan peristiwa dunia.',
      emoji: '🌍',
      color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      isLocked: true,
    },
  })

  console.log('✅ Courses created')

  // 3. Create Lessons
  const lesson1 = await prisma.lesson.create({
    data: {
      title: 'Aljabar Linear',
      content: 'Aljabar linear adalah cabang matematika yang mempelajari vektor, ruang vektor, transformasi linear, dan sistem persamaan linear.',
      courseId: mathCourse.id,
    },
  })

  const lesson2 = await prisma.lesson.create({
    data: {
      title: 'Sistem Tata Surya',
      content: 'Tata surya kita terdiri dari matahari dan semua objek yang mengorbit mengelilinginya, termasuk planet, bulan, asteroid, dan komet.',
      courseId: scienceCourse.id,
    },
  })

  const lesson3 = await prisma.lesson.create({
    data: {
      title: 'Puisi Kontemporer',
      content: 'Puisi kontemporer adalah puisi yang tidak terikat oleh aturan-aturan puisi lama seperti rima dan ritme yang ketat.',
      courseId: languageCourse.id,
    },
  })

  console.log('✅ Lessons created')

  // 4. Create Badges
  await prisma.badge.createMany({
    data: [
      {
        name: 'Matematika Jagoan',
        slug: 'math-expert',
        description: 'Selesaikan 10 pelajaran matematika',
        icon: '',
      },
      {
        name: 'Streak 7 Hari',
        slug: 'week-streak',
        description: 'Belajar selama 7 hari berturut-turut',
        icon: '🔥',
      },
      {
        name: 'Kuis Sempurna',
        slug: 'perfect-quiz',
        description: 'Dapatkan nilai 100 pada kuis',
        icon: '⭐',
      },
      {
        name: 'Penjelajah Sains',
        slug: 'science-explorer',
        description: 'Selesaikan semua pelajaran sains',
        icon: '',
      },
    ],
  })

  console.log('✅ Badges created')

  // 5. Create Progress
  await prisma.progress.create({
    data: {
      userId: student1.id,
      lessonId: lesson1.id,
      completed: true,
      score: 90,
      completedAt: new Date(),
    },
  })

  console.log('✅ Progress created')

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })