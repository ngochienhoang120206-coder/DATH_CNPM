const prisma = require('../config/db');

exports.getCourses = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = req.query.search || '';
    const categoryId = req.query.categoryId || undefined;

    const where = {
      isDeleted: false,
      isPublished: true,
      ...(categoryId && { categoryId }),
      ...(search && { title: { contains: search, mode: 'insensitive' } })
    };

    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          instructor: { select: { id: true, fullName: true } },
          category: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return res.json({
      success: true,
      data: courses,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: {
        instructor: { select: { id: true, fullName: true, bio: true } },
        chapters: {
          where: { isDeleted: false },
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              where: { isDeleted: false },
              orderBy: { position: 'asc' },
              include: {
                materials: { where: { isDeleted: false }, orderBy: { position: 'asc' } }
              }
            }
          }
        }
      }
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    return res.json({ success: true, data: course });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { title, description, prerequisites, categoryId, thumbnailUrl, isPublished = false } = req.body;
    const course = await prisma.course.create({
      data: {
        title,
        description,
        prerequisites,
        categoryId,
        thumbnailUrl,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        instructorId: req.user.id
      }
    });
    return res.status(201).json({ success: true, data: course });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};