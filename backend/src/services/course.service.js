import prisma from '../common/prisma/connect.prisma.js';

export const courseService = {
  async getCourses({ page = 1, limit = 10, search = '', categoryId = undefined }) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);

    const where = {
      isDeleted: false,
      is_published: true,
      ...(categoryId && { category_id: categoryId }),
      ...(search && { title: { contains: search, mode: 'insensitive' } })
    };

    const [total, courses] = await Promise.all([
      prisma.courses.count({ where }),
      prisma.courses.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          instructor: { select: { id: true, full_name: true } },
          category: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      courses,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  },

  async getCourseById(id, user) {
    const enrollment = await prisma.enrollments.findFirst({
      where: { user_id: user.id, course_id: id, status: 'enrolled', isDeleted: false },
      select: { id: true }
    });
    const course = await prisma.courses.findFirst({
      where: { id, isDeleted: false },
      include: {
        instructor: { select: { id: true, full_name: true, bio: true } },
        chapters: {
          where: { isDeleted: false },
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              where: { isDeleted: false },
              orderBy: { position: 'asc' },
              include: (enrollment || user.role === 'admin' || user.role === 'instructor') ? {
                materials: { where: { isDeleted: false }, orderBy: { position: 'asc' } }
              } : undefined
            }
          }
        }
      }
    });

    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    const isInstructor = user.role === 'instructor' && course.instructor_id === user.id;
    if (!course.is_published && !isInstructor && user.role !== 'admin') {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    const canAccessContent = Boolean(enrollment || isInstructor || user.role === 'admin');
    if (!canAccessContent) {
      for (const chapter of course.chapters) {
        for (const lesson of chapter.lessons) lesson.materials = [];
      }
    }

    return { ...course, isEnrolled: Boolean(enrollment), canAccessContent };
  },

  async createCourse(data, instructorId) {
    const { title, description, prerequisites, categoryId, thumbnailUrl, isPublished = false } = data;
    const course = await prisma.courses.create({
      data: {
        title,
        description,
        prerequisites,
        category_id: categoryId || null,
        thumbnail_url: thumbnailUrl || null,
        is_published: isPublished,
        published_at: isPublished ? new Date() : null,
        instructor_id: instructorId
      }
    });

    return course;
  }
};

export default courseService;
