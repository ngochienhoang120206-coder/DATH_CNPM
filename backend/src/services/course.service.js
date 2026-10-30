const prisma = require('../config/db');

const courseService = {
  async listCategories() {
    return prisma.categories.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' }
    });
  },

  async listCourses({ search = '', categoryId, page = 1, limit = 12, includeUnpublished = false }) {
    const pageNum = Math.max(Number(page) || 1, 1);
    const take = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const skip = (pageNum - 1) * take;

    const where = {
      isDeleted: false,
      ...(includeUnpublished ? {} : { is_published: true }),
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.courses.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: { select: { id: true, full_name: true, email: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { chapters: true, enrollments: true } }
        }
      }),
      prisma.courses.count({ where })
    ]);

    return {
      items,
      pagination: { page: pageNum, limit: take, total, totalPages: Math.ceil(total / take) }
    };
  },

  async getCourseById(courseId) {
    const course = await prisma.courses.findFirst({
      where: { id: courseId, isDeleted: false },
      include: {
        instructor: { select: { id: true, full_name: true, email: true, avatar_url: true, bio: true } },
        category: { select: { id: true, name: true, slug: true } },
        chapters: {
          where: { isDeleted: false },
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              where: { isDeleted: false },
              orderBy: { position: 'asc' },
              include: {
                materials: {
                  where: { isDeleted: false },
                  orderBy: { position: 'asc' }
                }
              }
            }
          }
        },
        assessments: {
          where: { isDeleted: false },
          select: { id: true, title: true, type: true, due_at: true, time_limit_minutes: true }
        }
      }
    });

    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }
    return course;
  },

  async verifyCourseOwnership(courseId, user) {
    const course = await prisma.courses.findFirst({
      where: { id: courseId, isDeleted: false }
    });
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }
    if (user.role !== 'admin' && course.instructor_id !== user.id) {
      const err = new Error('Forbidden: You do not own this course');
      err.statusCode = 403;
      throw err;
    }
    return course;
  },

  async createCourse(user, payload) {
    const { title, description, prerequisites, thumbnail_url, thumbnailUrl, category_id, categoryId, is_published } = payload;
    if (!title || !title.trim()) {
      const err = new Error('Course title is required');
      err.statusCode = 400;
      throw err;
    }

    const published = is_published !== undefined ? Boolean(is_published) : true;
    return prisma.courses.create({
      data: {
        instructor_id: user.id,
        category_id: category_id || categoryId || null,
        title: title.trim(),
        description: description || null,
        prerequisites: prerequisites || null,
        thumbnail_url: thumbnail_url || thumbnailUrl || null,
        is_published: published,
        published_at: published ? new Date() : null
      }
    });
  },

  async updateCourse(courseId, user, payload) {
    const existing = await this.verifyCourseOwnership(courseId, user);
    const data = {};

    if (payload.title !== undefined) data.title = payload.title.trim();
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.prerequisites !== undefined) data.prerequisites = payload.prerequisites;
    if (payload.thumbnail_url !== undefined || payload.thumbnailUrl !== undefined) {
      data.thumbnail_url = payload.thumbnail_url ?? payload.thumbnailUrl;
    }
    if (payload.category_id !== undefined || payload.categoryId !== undefined) {
      data.category_id = payload.category_id ?? payload.categoryId;
    }
    if (payload.is_published !== undefined) {
      data.is_published = Boolean(payload.is_published);
      if (data.is_published && !existing.published_at) data.published_at = new Date();
    }

    return prisma.courses.update({
      where: { id: courseId },
      data
    });
  },

  async softDeleteCourse(courseId, user) {
    await this.verifyCourseOwnership(courseId, user);
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const deleted = await tx.courses.update({
        where: { id: courseId },
        data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
      });

      if (user.role === 'admin') {
        await tx.admin_logs.create({
          data: {
            admin_id: user.id,
            action: 'DELETE_COURSE',
            target_type: 'courses',
            target_id: courseId,
            detail: { deletedAt: now.toISOString() }
          }
        });
      }
      return deleted;
    });
  },

  async createChapter(courseId, user, { title, position }) {
    await this.verifyCourseOwnership(courseId, user);
    if (!title || !title.trim()) {
      const err = new Error('Chapter title is required');
      err.statusCode = 400;
      throw err;
    }

    let pos = position;
    if (pos === undefined) {
      const count = await prisma.chapters.count({ where: { course_id: courseId } });
      pos = count + 1;
    }

    return prisma.chapters.create({
      data: {
        course_id: courseId,
        title: title.trim(),
        position: Number(pos)
      }
    });
  },

  async createLesson(chapterId, user, { title, position }) {
    const chapter = await prisma.chapters.findFirst({
      where: { id: chapterId, isDeleted: false }
    });
    if (!chapter) {
      const err = new Error('Chapter not found');
      err.statusCode = 404;
      throw err;
    }
    await this.verifyCourseOwnership(chapter.course_id, user);

    let pos = position;
    if (pos === undefined) {
      const count = await prisma.lessons.count({ where: { chapter_id: chapterId } });
      pos = count + 1;
    }

    return prisma.lessons.create({
      data: {
        chapter_id: chapterId,
        title: title.trim(),
        position: Number(pos)
      }
    });
  },

  async createMaterial(lessonId, user, { type, title, url, content, duration_seconds, position }) {
    const lesson = await prisma.lessons.findFirst({
      where: { id: lessonId, isDeleted: false },
      include: { chapter: true }
    });
    if (!lesson) {
      const err = new Error('Lesson not found');
      err.statusCode = 404;
      throw err;
    }
    await this.verifyCourseOwnership(lesson.chapter.course_id, user);

    if (!['video', 'text'].includes(type)) {
      const err = new Error('Material type must be video or text');
      err.statusCode = 400;
      throw err;
    }

    return prisma.materials.create({
      data: {
        lesson_id: lessonId,
        type,
        title: title || null,
        url: url || null,
        content: content || null,
        duration_seconds: duration_seconds ? Number(duration_seconds) : null,
        position: position ? Number(position) : 0
      }
    });
  }
};

module.exports = courseService;