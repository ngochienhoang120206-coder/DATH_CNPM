require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function main() {
  const roles = ['admin', 'instructor', 'student'];
  const roleMap = {};
  for (const name of roles) {
    const r = await prisma.roles.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    roleMap[name] = r.id;
  }

  const passwordHash = await bcrypt.hash('Demo@12345', 10);

  const admin = await prisma.users.upsert({
    where: { email: 'admin@demo.edu.vn' },
    update: {},
    create: {
      email: 'admin@demo.edu.vn',
      full_name: 'System Administrator',
      password: passwordHash,
      role_id: roleMap.admin,
      is_verified: true
    }
  });

  const instructor = await prisma.users.upsert({
    where: { email: 'instructor@demo.edu.vn' },
    update: {},
    create: {
      email: 'instructor@demo.edu.vn',
      full_name: 'Dr. Phat Tran',
      password: passwordHash,
      role_id: roleMap.instructor,
      is_verified: true
    }
  });

  const learner = await prisma.users.upsert({
    where: { email: 'learner@demo.edu.vn' },
    update: {},
    create: {
      email: 'learner@demo.edu.vn',
      full_name: 'Hoang Ngoc Hien',
      password: passwordHash,
      role_id: roleMap.student,
      is_verified: true
    }
  });

  const category = await prisma.categories.upsert({
    where: { slug: 'software-engineering' },
    update: {},
    create: { name: 'Software Engineering', slug: 'software-engineering' }
  });

  let course = await prisma.courses.findFirst({
    where: { title: 'Full-Stack Web Development with React & Node.js', isDeleted: false }
  });

  if (!course) {
    course = await prisma.courses.create({
      data: {
        title: 'Full-Stack Web Development with React & Node.js',
        description: 'Master modern web architecture and real-time collaborative systems.',
        prerequisites: 'Basic knowledge of JavaScript and HTML/CSS',
        is_published: true,
        published_at: new Date(),
        instructor_id: instructor.id,
        category_id: category.id,
        chapters: {
          create: [
            {
              title: 'Chapter 1: Core LMS & Real-Time Architecture',
              position: 1,
              lessons: {
                create: [
                  {
                    title: 'Lesson 1.1: Introduction to WebSockets & CRDTs',
                    position: 1,
                    materials: {
                      create: [
                        { type: 'video', title: 'Lecture Video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', position: 1 },
                        { type: 'text', title: 'Lecture Notes', content: '## Key Concepts\n- Full-duplex communication via Socket.io\n- Conflict-free Replicated Data Types (Yjs)', position: 2 }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    });
  }

  await prisma.enrollments.upsert({
    where: { user_id_course_id: { user_id: learner.id, course_id: course.id } },
    update: { status: 'enrolled', isDeleted: false },
    create: { user_id: learner.id, course_id: course.id, status: 'enrolled', progress_percent: 0 }
  });

  console.log('Seed completed:', { admin: admin.email, instructor: instructor.email, learner: learner.email });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());