const router = require('express').Router();
const ctrl = require('../controllers/assessment.controller');
router.get('/assessments/health', ctrl.placeholder);
module.exports = router;