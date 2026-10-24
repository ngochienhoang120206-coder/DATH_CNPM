const router = require('express').Router();
const ctrl = require('../controllers/interaction.controller');
router.get('/interactions/health', ctrl.placeholder);
module.exports = router;