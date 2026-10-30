import prisma from '../common/prisma/connect.prisma.js';
import { BadRequestException, ForbiddenException, NotFoundException } from '../common/helpers/exception.helper.js';

export const courseService = {
  async listCategories() {
    return prisma.categories.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' }
    });
  },

  async listCourses({ search = '', categoryId, page = 1, limit = 12 }) {
    const pageNum = Math.max(Number(page) || 1, 1);
    const take = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const skip = (pageNum - 1) * take;

    const where = {
      isDeleted: false,
      is_published: true,
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

    const pagination = { page: pageNum, limit: take, total, totalPages: Math.ceil(total / take) };
    return {
      items,
      courses: items,
      pagination,
      meta: pagination
    };
  },

  async getCourseById(courseId, user) {
    const course = await prisma.courses.findFirst({
      where: { id: courseId, isDeleted: false },
      include: {
        instructor: { select: { id: true, full_name: true, avatar_url: true, bio: true } },
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

    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = user?.role === 'admin';
    const isOwner = user?.role === 'instructor' && course.instructor_id === user.id;
    if (!course.is_published && !isAdmin && !isOwner) {
      throw new NotFoundException('Course not found');
    }

    let canAccessContent = isAdmin || isOwner;
    if (!canAccessContent && user?.role === 'student') {
      const enrollment = await prisma.enrollments.findFirst({
        where: {
          user_id: user.id,
          course_id: courseId,
          status: { in: ['enrolled', 'completed'] },
          isDeleted: false
        },
        select: { id: true }
      });
      canAccessContent = Boolean(enrollment);
    }

    if (!canAccessContent) {
      course.assessments = [];
      for (const chapter of course.chapters) {
        for (const lesson of chapter.lessons) lesson.materials = [];
      }
    }
    return course;
  },

  async verifyCourseOwnership(courseId, user) {
    const course = await prisma.courses.findFirst({
      where: { id: courseId, isDeleted: false }
    });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== 'admin' && course.instructor_id !== user.id) {
      throw new ForbiddenException('Forbidden: You do not own this course');
    }
    return course;
  },

  async createCourse(user, payload) {
    const { title, description, prerequisites, thumbnail_url, thumbnailUrl, category_id, categoryId, is_published, isPublished } = payload;
    if (!title || !title.trim()) throw new BadRequestException('Course title is required');

    const published = is_published !== undefined ? Boolean(is_published) : (isPublished !== undefined ? Boolean(isPublished) : true);
    return prisma.courses.create({
      data: {
        instructor_id: user.id || user.userId,
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
    if (payload.is_published !== undefined || payload.isPublished !== undefined) {
      data.is_published = Boolean(payload.is_published ?? payload.isPublished);
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
      await tx.chapters.updateMany({
        where: { course_id: courseId, isDeleted: false },
        data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
      });
      await tx.lessons.updateMany({
        where: { chapter: { course_id: courseId }, isDeleted: false },
        data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
      });
      await tx.materials.updateMany({
        where: { lesson: { chapter: { course_id: courseId } }, isDeleted: false },
        data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
      });

      if (user.role === 'admin') {
        try {
          await tx.admin_logs.create({
            data: {
              admin_id: user.id,
              action: 'DELETE_COURSE',
              target_type: 'courses',
              target_id: courseId,
              detail: { deletedAt: now.toISOString() }
            }
          });
        } catch {}
      }
      return deleted;
    });
  },

  async createChapter(courseId, user, { title, position }) {
    await this.verifyCourseOwnership(courseId, user);
    if (!title || !title.trim()) throw new BadRequestException('Chapter title is required');

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
    if (!chapter) throw new NotFoundException('Chapter not found');
    if (!title || !title.trim()) throw new BadRequestException('Lesson title is required');
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
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.verifyCourseOwnership(lesson.chapter.course_id, user);

    if (!['video', 'text'].includes(type)) {
      throw new BadRequestException('Material type must be video or text');
    }
    if (type === 'video' && !url) throw new BadRequestException('Video materials require a URL');
    if (type === 'text' && !content) throw new BadRequestException('Text materials require content');

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
  },

  async updateChapter(chapterId, user, { title, position }) {
    const chapter = await prisma.chapters.findFirst({ where: { id: chapterId, isDeleted: false } });
    if (!chapter) throw new NotFoundException('Chapter not found');
    await this.verifyCourseOwnership(chapter.course_id, user);
    const data = {};
    if (title !== undefined) {
      if (!title.trim()) throw new BadRequestException('Chapter title is required');
      data.title = title.trim();
    }
    if (position !== undefined) data.position = Number(position);
    return prisma.chapters.update({ where: { id: chapterId }, data });
  },

  async deleteChapter(chapterId, user) {
    const chapter = await prisma.chapters.findFirst({ where: { id: chapterId, isDeleted: false } });
    if (!chapter) throw new NotFoundException('Chapter not found');
    await this.verifyCourseOwnership(chapter.course_id, user);
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      await tx.materials.updateMany({
        where: { lesson: { chapter_id: chapterId }, isDeleted: false },
        data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
      });
      await tx.lessons.updateMany({
        where: { chapter_id: chapterId, isDeleted: false },
        data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
      });
      return tx.chapters.update({
        where: { id: chapterId },
        data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
      });
    });
  },

  async updateLesson(lessonId, user, { title, position }) {
    const lesson = await prisma.lessons.findFirst({
      where: { id: lessonId, isDeleted: false },
      include: { chapter: true }
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.verifyCourseOwnership(lesson.chapter.course_id, user);
    const data = {};
    if (title !== undefined) {
      if (!title.trim()) throw new BadRequestException('Lesson title is required');
      data.title = title.trim();
    }
    if (position !== undefined) data.position = Number(position);
    return prisma.lessons.update({ where: { id: lessonId }, data });
  },

  async deleteLesson(lessonId, user) {
    const lesson = await prisma.lessons.findFirst({
      where: { id: lessonId, isDeleted: false },
      include: { chapter: true }
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.verifyCourseOwnership(lesson.chapter.course_id, user);
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      await tx.materials.updateMany({
        where: { lesson_id: lessonId, isDeleted: false },
        data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
      });
      return tx.lessons.update({
        where: { id: lessonId },
        data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
      });
    });
  },

  async updateMaterial(materialId, user, payload) {
    const material = await prisma.materials.findFirst({
      where: { id: materialId, isDeleted: false },
      include: { lesson: { include: { chapter: true } } }
    });
    if (!material) throw new NotFoundException('Material not found');
    await this.verifyCourseOwnership(material.lesson.chapter.course_id, user);
    const data = {};
    if (payload.title !== undefined) data.title = payload.title;
    if (payload.url !== undefined) data.url = payload.url;
    if (payload.content !== undefined) data.content = payload.content;
    if (payload.duration_seconds !== undefined || payload.durationSeconds !== undefined) {
      data.duration_seconds = Number(payload.duration_seconds ?? payload.durationSeconds);
    }
    if (payload.position !== undefined) data.position = Number(payload.position);
    if (payload.type !== undefined) {
      if (!['video', 'text'].includes(payload.type)) throw new BadRequestException('Material type must be video or text');
      data.type = payload.type;
    }
    return prisma.materials.update({ where: { id: materialId }, data });
  },

  async deleteMaterial(materialId, user) {
    const material = await prisma.materials.findFirst({
      where: { id: materialId, isDeleted: false },
      include: { lesson: { include: { chapter: true } } }
    });
    if (!material) throw new NotFoundException('Material not found');
    await this.verifyCourseOwnership(material.lesson.chapter.course_id, user);
    const now = new Date();
    return prisma.materials.update({
      where: { id: materialId },
      data: { isDeleted: true, deletedAt: now, deletedBy: user.id }
    });
  }
};

export default courseService;
