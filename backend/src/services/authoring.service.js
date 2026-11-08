const assessmentService = require('../services/assessment.service');

exports.getAssessmentById = async (req, res) => {
  try {
    const data = await assessmentService.getAssessmentById(req.params.id, req.user);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 404).json({ success: false, message: err.message });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const data = await assessmentService.submitQuiz(req.params.id, req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Quiz submitted and graded successfully',
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.submitFile = async (req, res) => {
  try {
    const data = await assessmentService.submitFile(req.params.id, req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Assignment file submitted successfully',
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.gradeSubmission = async (req, res) => {
  try {
    const submissionId = req.params.submission_id || req.params.id;
    const data = await assessmentService.gradeSubmission(submissionId, req.user, req.body);
    return res.json({
      success: true,
      message: 'Submission graded successfully',
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const data = await assessmentService.getMySubmissions(req.user.id, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};