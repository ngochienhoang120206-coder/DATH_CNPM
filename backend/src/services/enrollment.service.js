import prisma from '../common/prisma/connect.prisma.js';
import { ForbiddenException, NotFoundException, BadRequestException } from '../common/helpers/exception.helper.js';

export const enrollmentService = {
  async enrollCourse(userId, courseId) {
    if (!courseId) throw new BadRequestException('Course id is required');

    const course = await prisma.courses.findFirst({
      where: { id: courseId, isDeleted: false, is_published: true }
    });
    if (!course) throw new NotFoundException('Course not found or not available for enrollment');

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
    if (!enrollment) throw new NotFoundException('Enrollment not found');

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

  async getMyCourses(userId) {
    const enrollments = await this.getMyEnrollments(userId);
    const inProgress = enrollments.filter((item) => item.status === 'enrolled');
    const completed = enrollments.filter((item) => item.status === 'completed');
    return {
      inProgress,
      in_progress: inProgress,
      completed,
      enrollments,
      courses: enrollments
    };
  },

  async getResume(userId, courseId) {
    const enrollment = await prisma.enrollments.findFirst({
      where: {
        user_id: userId,
        status: { in: ['enrolled', 'completed'] },
        isDeleted: false,
        ...(courseId ? { course_id: courseId } : {})
      },
      orderBy: { updatedAt: 'desc' },
      include: { last_lesson: { select: { id: true, title: true } } }
    });

    return {
      courseId: enrollment?.course_id || null,
      course_id: enrollment?.course_id || null,
      lastLessonId: enrollment?.last_lesson_id || null,
      last_lesson_id: enrollment?.last_lesson_id || null,
      lastLesson: enrollment?.last_lesson || null
    };
  },

  async updateLessonProgress(userId, lessonId, payload = {}) {
    const rawIsCompleted = payload.is_completed ?? payload.isCompleted ?? true;
    if (typeof rawIsCompleted !== 'boolean') {
      throw new BadRequestException('Invalid completion status');
    }

    const rawPosition = payload.last_position_seconds ?? payload.lastPositionSeconds ?? 0;
    const last_position_seconds = typeof rawPosition === 'number' ? rawPosition : Number(rawPosition);
    if (!Number.isInteger(last_position_seconds) || last_position_seconds < 0 || last_position_seconds > 86400) {
      throw new BadRequestException('Invalid lesson position');
    }
    const is_completed = rawIsCompleted;

    const lesson = await prisma.lessons.findFirst({
      where: { id: lessonId, isDeleted: false, chapter: { isDeleted: false, course: { isDeleted: false, is_published: true } } },
      include: { chapter: true }
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const courseId = lesson.chapter.course_id;
    const enrollment = await prisma.enrollments.findFirst({
      where: { user_id: userId, course_id: courseId, status: 'enrolled', isDeleted: false }
    });
    if (!enrollment) throw new ForbiddenException('Forbidden: You must be enrolled in this course');

    const progressRecord = await prisma.progress.upsert({
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

    const updatedEnrollment = await prisma.enrollments.update({
      where: { id: enrollment.id },
      data: {
        progress_percent: progressPercent,
        last_lesson_id: lessonId,
        status: progressPercent >= 100 ? 'completed' : 'enrolled',
        completed_at: progressPercent >= 100 ? new Date() : null
      }
    });
    return { ...progressRecord, enrollment: updatedEnrollment };
  }
};

export default enrollmentService;
