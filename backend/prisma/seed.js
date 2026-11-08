require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function main() {
  // 1. Roles
  const roles = ['admin', 'instructor', 'student'];
  const roleMap = {};
  for (const name of roles) {
    const r = await prisma.roles.upsert({
      where: { name },
      update: { isDeleted: false },
      create: { name }
    });
    roleMap[name] = r.id;
  }

  const passwordHash = await bcrypt.hash('Demo@12345', 10);

  // 2. Users (Admin, Instructor, Learner)
  const admin = await prisma.users.upsert({
    where: { email: 'admin@demo.edu.vn' },
    update: { password: passwordHash, status: 'active', isDeleted: false, role_id: roleMap.admin },
    create: {
      email: 'admin@demo.edu.vn',
      full_name: 'System Administrator',
      password: passwordHash,
      role_id: roleMap.admin,
      status: 'active',
      is_verified: true
    }
  });

  const instructor = await prisma.users.upsert({
    where: { email: 'instructor@demo.edu.vn' },
    update: {
      password: passwordHash,
      status: 'active',
      isDeleted: false,
      role_id: roleMap.instructor
    },
    create: {
      email: 'instructor@demo.edu.vn',
      full_name: 'Dr. Phat Tran',
      password: passwordHash,
      role_id: roleMap.instructor,
      bio: 'Faculty of CSE',
      status: 'active',
      is_verified: true
    }
  });

  const learner = await prisma.users.upsert({
    where: { email: 'learner@demo.edu.vn' },
    update: { password: passwordHash, status: 'active', isDeleted: false, role_id: roleMap.student },
    create: {
      email: 'learner@demo.edu.vn',
      full_name: 'Hoang Ngoc Hien',
      password: passwordHash,
      role_id: roleMap.student,
      status: 'active',
      is_verified: true
    }
  });

  // 3. Categories
  const category = await prisma.categories.upsert({
    where: { slug: 'software-engineering' },
    update: { isDeleted: false },
    create: { name: 'Software Engineering', slug: 'software-engineering' }
  });

  // 4. Courses, Chapters, Lessons, Materials
  let course = await prisma.courses.findFirst({
    where: { title: 'Full-Stack Web Development with React & Node.js', isDeleted: false },
    include: {
      chapters: {
        include: { lessons: true }
      }
    }
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
                        {
                          type: 'video',
                          title: 'Lecture Video',
                          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                          duration_seconds: 600,
                          position: 1
                        },
                        {
                          type: 'text',
                          title: 'Lecture Notes',
                          content:
                            '## Key Concepts\n- Full-duplex communication via Socket.io\n- Conflict-free Replicated Data Types (Yjs)',
                          position: 2
                        }
                      ]
                    }
                  },
                  {
                    title: 'Lesson 1.2: Role-Based Access Control & JWT Security',
                    position: 2,
                    materials: {
                      create: [
                        {
                          type: 'text',
                          title: 'RBAC & HttpOnly Cookie Guide',
                          content:
                            '## Security Best Practices\n- Store JWT inside HttpOnly cookies\n- Validate single-use WebSocket tickets via Redis TTL',
                          position: 1
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      include: {
        chapters: {
          include: { lessons: true }
        }
      }
    });
  }

  const firstLesson = course.chapters?.[0]?.lessons?.[0] || null;

  // 5. Enrollments & Progress
  const enrollment = await prisma.enrollments.upsert({
    where: { user_id_course_id: { user_id: learner.id, course_id: course.id } },
    update: { status: 'enrolled', isDeleted: false },
    create: {
      user_id: learner.id,
      course_id: course.id,
      status: 'enrolled',
      progress_percent: 50,
      last_lesson_id: firstLesson ? firstLesson.id : null
    }
  });

  if (firstLesson) {
    await prisma.progress.upsert({
      where: {
        enrollment_id_lesson_id: {
          enrollment_id: enrollment.id,
          lesson_id: firstLesson.id
        }
      },
      update: { is_completed: true, last_position_seconds: 120, completed_at: new Date() },
      create: {
        enrollment_id: enrollment.id,
        lesson_id: firstLesson.id,
        is_completed: true,
        last_position_seconds: 120,
        completed_at: new Date()
      }
    });
  }

  // 6. Assessments (1 Timed Quiz with 3 Questions & Answers + 1 File Assignment)
  const futureDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  let quiz = await prisma.assessments.findFirst({
    where: {
      course_id: course.id,
      type: 'quiz',
      isDeleted: false
    }
  });

  if (!quiz) {
    quiz = await prisma.assessments.create({
      data: {
        course_id: course.id,
        lesson_id: firstLesson ? firstLesson.id : null,
        type: 'quiz',
        title: 'Quiz 1: WebSockets, Redis & CRDT Fundamentals',
        description: 'Timed multiple-choice quiz verifying real-time architecture concepts.',
        time_limit_minutes: 15,
        due_at: futureDueDate,
        max_attempts: 3,
        pass_score: 60
      }
    });

    const q1 = await prisma.questions.create({
      data: {
        assessment_id: quiz.id,
        content: 'Which data structure prevents merge conflicts in collaborative code editing?',
        points: 40,
        position: 1
      }
    });
    await prisma.answers.createMany({
      data: [
        { question_id: q1.id, content: 'CRDT (Yjs)', is_correct: true, position: 1 },
        { question_id: q1.id, content: 'Static REST Polling', is_correct: false, position: 2 },
        { question_id: q1.id, content: 'FTP File Locking', is_correct: false, position: 3 }
      ]
    });

    const q2 = await prisma.questions.create({
      data: {
        assessment_id: quiz.id,
        content: 'How are live classroom WebSocket handshakes authenticated in this platform?',
        points: 30,
        position: 2
      }
    });
    await prisma.answers.createMany({
      data: [
        {
          question_id: q2.id,
          content: 'Single-use Redis ticket with 30-second TTL',
          is_correct: true,
          position: 1
        },
        {
          question_id: q2.id,
          content: 'Plaintext password in URL query string',
          is_correct: false,
          position: 2
        },
        {
          question_id: q2.id,
          content: 'Unauthenticated anonymous broadcast',
          is_correct: false,
          position: 3
        }
      ]
    });

    const q3 = await prisma.questions.create({
      data: {
        assessment_id: quiz.id,
        content: 'Which library is used to render vector drawing paths on the shared whiteboard?',
        points: 30,
        position: 3
      }
    });
    await prisma.answers.createMany({
      data: [
        { question_id: q3.id, content: 'Fabric.js', is_correct: true, position: 1 },
        { question_id: q3.id, content: 'jQuery UI', is_correct: false, position: 2 },
        { question_id: q3.id, content: 'Bootstrap Icons', is_correct: false, position: 3 }
      ]
    });
  }

  let assignment = await prisma.assessments.findFirst({
    where: {
      course_id: course.id,
      type: 'assignment',
      isDeleted: false
    }
  });

  if (!assignment) {
    assignment = await prisma.assessments.create({
      data: {
        course_id: course.id,
        lesson_id: firstLesson ? firstLesson.id : null,
        type: 'assignment',
        title: 'Assignment 1: System Architecture & Sequence Diagram Report',
        description: 'Upload your architecture report PDF or GitHub repository archive link.',
        due_at: futureDueDate,
        max_attempts: 5,
        pass_score: 50
      }
    });
  }

  // 7. Sample Submission (1 ungraded file submission for Instructor grading table)
  const existingSub = await prisma.submissions.findFirst({
    where: {
      assessment_id: assignment.id,
      user_id: learner.id,
      isDeleted: false
    }
  });

  if (!existingSub) {
    await prisma.submissions.create({
      data: {
        assessment_id: assignment.id,
        user_id: learner.id,
        attempt_no: 1,
        file_url: 'https://github.com/ngochienhoang120206-coder/DATH_CNPM/blob/main/README.md',
        submitted_at: new Date()
      }
    });
  }

  // 8. Comments, Reviews, Reports, Notifications, Admin Logs, Sessions
  let sampleComment = null;
  if (firstLesson) {
    sampleComment = await prisma.comments.findFirst({
      where: { lesson_id: firstLesson.id, user_id: learner.id, isDeleted: false }
    });
    if (!sampleComment) {
      sampleComment = await prisma.comments.create({
        data: {
          lesson_id: firstLesson.id,
          user_id: learner.id,
          content: 'The Yjs CRDT synchronization with Monaco Editor works smoothly!'
        }
      });

      await prisma.comments.create({
        data: {
          lesson_id: firstLesson.id,
          user_id: instructor.id,
          parent_id: sampleComment.id,
          content: 'Great observation! Try testing the whiteboard and code editor side by side.'
        }
      });
    }
  }

  const existingReview = await prisma.reviews.findFirst({
    where: { course_id: course.id, user_id: learner.id, isDeleted: false }
  });
  if (!existingReview) {
    await prisma.reviews.create({
      data: {
        course_id: course.id,
        user_id: learner.id,
        rating: 5,
        comment: 'Practical course with built-in real-time pair programming classroom.'
      }
    });
  }

  if (sampleComment) {
    const existingReport = await prisma.reports.findFirst({
      where: { comment_id: sampleComment.id, isDeleted: false }
    });
    if (!existingReport) {
      await prisma.reports.create({
        data: {
          reporter_id: learner.id,
          comment_id: sampleComment.id,
          course_id: course.id,
          reason: 'Sample moderation report for Admin Dashboard verification',
          status: 'pending'
        }
      });
    }
  }

  const existingLog = await prisma.admin_logs.findFirst({
    where: { admin_id: admin.id }
  });
  if (!existingLog) {
    await prisma.admin_logs.create({
      data: {
        admin_id: admin.id,
        action: 'SEED_INITIAL_DATA',
        target_type: 'courses',
        target_id: course.id,
        detail: { message: 'Initialized baseline LMS course and assessment records' }
      }
    });
  }

  const existingSession = await prisma.sessions.findFirst({
    where: { course_id: course.id, isDeleted: false }
  });
  if (!existingSession) {
    await prisma.sessions.create({
      data: {
        course_id: course.id,
        host_id: instructor.id,
        started_at: new Date(),
        whiteboard_snapshot: [],
        code_snapshot:
          '#include <iostream>\n\nint main() {\n    std::cout << "Hello World!" << std::endl;\n    return 0;\n}',
        notes_snapshot: 'Real-time Whiteboard & Yjs CRDT synchronization verified.'
      }
    });
  }

  // Seed notification safely across enum variations
  const existingNotif = await prisma.notifications.findFirst({
    where: { user_id: learner.id, isDeleted: false }
  });
  if (!existingNotif) {
    const candidateTypes = ['system', 'course', 'assessment', 'grade', 'comment', 'general'];
    for (const t of candidateTypes) {
      try {
        await prisma.notifications.create({
          data: {
            user_id: learner.id,
            type: t,
            title: 'Welcome to Full-Stack Web Development',
            message: 'Quiz 1 and Assignment 1 are now open for submission.',
            is_read: false
          }
        });
        break;
      } catch (_e) {
        // Try next enum literal
      }
    }
  }

  console.log('Seed completed across all domains:', {
    admin: admin.email,
    instructor: instructor.email,
    learner: learner.email,
    courseId: course.id,
    quizId: quiz.id,
    assignmentId: assignment.id
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());