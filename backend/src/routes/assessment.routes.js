const router = require('express').Router();
const assessmentController = require('../controllers/assessment.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.get('/assessments/:id', verifyToken, assessmentController.getAssessmentById);
router.post('/assessments/:id/submit-quiz', verifyToken, assessmentController.submitQuiz);
router.post('/assessments/:id/submit-file', verifyToken, assessmentController.submitFile);
router.put(
  '/assessments/submissions/:submission_id/grade',
  verifyToken,
  requireRole('instructor'),
  assessmentController.gradeSubmission
);
router.get('/users/me/submissions', verifyToken, assessmentController.getMySubmissions);

module.exports = router;