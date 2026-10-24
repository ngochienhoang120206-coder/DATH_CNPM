const router = require('express').Router();
const assessmentController = require('../controllers/assessment.controller');

router.get('/assessments/health', assessmentController.placeholder);

module.exports = router;