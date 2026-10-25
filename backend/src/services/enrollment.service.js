import prisma from '../common/prisma/connect.prisma.js';

export const enrollmentService = {
  async enrollCourse(userId, courseId) {
    const course = await prisma.courses.findFirst({
      where: { id: courseId, isDeleted: false, is_published: true },
      select: { id: true }
    });
    if (!course) {
      const error = new Error('Course not found or not available for enrollment');
      error.statusCode = 404;
      throw error;
    }

    const enrollment = await prisma.enrollments.upsert({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
      update: { status: 'enrolled', isDeleted: false, left_at: null },
      create: { user_id: userId, course_id: courseId, status: 'enrolled' }
    });

    return enrollment;
  },

  async leaveCourse(userId, courseId) {
    const updated = await prisma.enrollments.update({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
      data: { status: 'left', left_at: new Date() }
    });

    return updated;
  },

  async updateLessonProgress({ userId, lessonId, courseId, isCompleted = true, lastPositionSeconds = 0 }) {
    if (!Number.isFinite(lastPositionSeconds) || !Number.isInteger(lastPositionSeconds) || lastPositionSeconds < 0 || lastPositionSeconds > 86400) {
      const error = new Error('Invalid lesson position');
      error.statusCode = 400;
      throw error;
    }
    if (typeof isCompleted !== 'boolean') {
      const error = new Error('Invalid completion status');
      error.statusCode = 400;
      throw error;
    }

    const enrollment = await prisma.enrollments.findFirst({
      where: { user_id: userId, course_id: courseId, status: 'enrolled', isDeleted: false }
    });

    if (!enrollment) {
      const error = new Error('User is not enrolled in this course');
      error.statusCode = 403;
      throw error;
    }

    const lesson = await prisma.lessons.findFirst({
      where: {
        id: lessonId,
        isDeleted: false,
        chapter: {
          is: {
            isDeleted: false,
            course_id: courseId,
            course: { is: { isDeleted: false, is_published: true } }
          }
        }
      },
      select: { id: true }
    });
    if (!lesson) {
      const error = new Error('Lesson does not belong to this course');
      error.statusCode = 404;
      throw error;
    }

    const progressRecord = await prisma.progress.upsert({
      where: { enrollment_id_lesson_id: { enrollment_id: enrollment.id, lesson_id: lessonId } },
      update: {
        is_completed: isCompleted,
        last_position_seconds: lastPositionSeconds,
        completed_at: isCompleted ? new Date() : null
      },
      create: {
        enrollment_id: enrollment.id,
        lesson_id: lessonId,
        is_completed: isCompleted,
        last_position_seconds: lastPositionSeconds,
        completed_at: isCompleted ? new Date() : null
      }
    });

    await prisma.enrollments.update({
      where: { id: enrollment.id },
      data: { last_lesson_id: lessonId }
    });

    return progressRecord;
  }
};

export default enrollmentService;
