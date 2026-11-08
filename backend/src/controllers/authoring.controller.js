const authoringService = require('../services/authoring.service');

exports.listCourseAssessments = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const data = await authoringService.listCourseAssessments(courseId);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 404).json({ success: false, message: err.message });
  }
};

exports.createCourseAssessment = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const data = await authoringService.createCourseAssessment(courseId, req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.listAssessmentSubmissions = async (req, res) => {
  try {
    const data = await authoringService.listAssessmentSubmissions(
      req.params.id,
      req.user,
      req.query
    );
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 403).json({ success: false, message: err.message });
  }
};

exports.getCourseReviews = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const data = await authoringService.getCourseReviews(courseId);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.upsertCourseReview = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const data = await authoringService.upsertCourseReview(courseId, req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Course review saved successfully',
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};