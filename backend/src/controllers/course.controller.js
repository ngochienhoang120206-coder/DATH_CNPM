const courseService = require('../services/course.service');

exports.listCategories = async (req, res) => {
  try {
    const data = await courseService.listCategories();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.listCourses = async (req, res) => {
  try {
    const result = await courseService.listCourses(req.query);
    return res.json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const data = await courseService.getCourseById(req.params.id);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 404).json({ success: false, message: err.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const data = await courseService.createCourse(req.user, req.body);
    return res.status(201).json({ success: true, message: 'Course created successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const data = await courseService.updateCourse(req.params.id, req.user, req.body);
    return res.json({ success: true, message: 'Course updated successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    await courseService.softDeleteCourse(req.params.id, req.user);
    return res.json({ success: true, message: 'Course soft-deleted successfully' });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.createChapter = async (req, res) => {
  try {
    const data = await courseService.createChapter(req.params.courseId, req.user, req.body);
    return res.status(201).json({ success: true, message: 'Chapter created successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const data = await courseService.createLesson(req.params.chapterId, req.user, req.body);
    return res.status(201).json({ success: true, message: 'Lesson created successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.createMaterial = async (req, res) => {
  try {
    const data = await courseService.createMaterial(req.params.lessonId, req.user, req.body);
    return res.status(201).json({ success: true, message: 'Material created successfully', data });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};