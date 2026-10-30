const prisma = require('../config/db');

const enrollmentService = {
  async enrollCourse(userId, courseId) {
    const course = await prisma.courses.findFirst({
      where: { id: courseId, isDeleted: false }
    });
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    return prisma.enrollments.upsert({
      where: {
        user_id_course_id: { user_id: userId, course_id: courseId }
      },
      update: {
        status: 'enrolled',
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        left_at: null,
        enrolled_at: new Date()
      },
      create: {
        user_id: userId,
        course_id: courseId,
        status: 'enrolled',
        progress_percent: 0
      }
    });
  },

  async leaveCourse(userId, courseId) {
    const enrollment = await prisma.enrollments.findFirst({
      where: { user_id: userId, course_id: courseId, isDeleted: false }
    });
    if (!enrollment) {
      const err = new Error('Enrollment not found');
      err.statusCode = 404;
      throw err;
    }

    return prisma.enrollments.update({
      where: { id: enrollment.id },
      data: {
        status: 'left',
        left_at: new Date()
      }
    });
  },

  async getMyEnrollments(userId) {
    return prisma.enrollments.findMany({
      where: {
        user_id: userId,
        status: { in: ['enrolled', 'completed'] },
        isDeleted: false
      },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, full_name: true } },
            category: { select: { id: true, name: true } }
          }
        },
        last_lesson: { select: { id: true, title: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  },

  async updateLessonProgress(userId, lessonId, { is_completed = true, last_position_seconds = 0 }) {
    const lesson = await prisma.lessons.findFirst({
      where: { id: lessonId, isDeleted: false },
      include: { chapter: true }
    });
    if (!lesson) {
      const err = new Error('Lesson not found');
      err.statusCode = 404;
      throw err;
    }

    const courseId = lesson.chapter.course_id;
    const enrollment = await prisma.enrollments.findFirst({
      where: { user_id: userId, course_id: courseId, status: 'enrolled', isDeleted: false }
    });
    if (!enrollment) {
      const err = new Error('Forbidden: You must be enrolled in this course');
      err.statusCode = 403;
      throw err;
    }

    await prisma.progress.upsert({
      where: {
        enrollment_id_lesson_id: {
          enrollment_id: enrollment.id,
          lesson_id: lessonId
        }
      },
      update: {
        is_completed: Boolean(is_completed),
        last_position_seconds: Number(last_position_seconds) || 0,
        completed_at: is_completed ? new Date() : null
      },
      create: {
        enrollment_id: enrollment.id,
        lesson_id: lessonId,
        is_completed: Boolean(is_completed),
        last_position_seconds: Number(last_position_seconds) || 0,
        completed_at: is_completed ? new Date() : null
      }
    });

    const [totalLessons, completedLessons] = await Promise.all([
      prisma.lessons.count({
        where: { isDeleted: false, chapter: { course_id: courseId, isDeleted: false } }
      }),
      prisma.progress.count({
        where: {
          enrollment_id: enrollment.id,
          is_completed: true,
          lesson: { isDeleted: false, chapter: { isDeleted: false } }
        }
      })
    ]);

    const progressPercent = totalLessons > 0
      ? Math.min(100, Number(((completedLessons / totalLessons) * 100).toFixed(2)))
      : 0;

    return prisma.enrollments.update({
      where: { id: enrollment.id },
      data: {
        progress_percent: progressPercent,
        last_lesson_id: lessonId,
        status: progressPercent >= 100 ? 'completed' : 'enrolled',
        completed_at: progressPercent >= 100 ? new Date() : null
      }
    });
  }
};

module.exports = enrollmentService;