const router = require('express').Router();
const interactionController = require('../controllers/interaction.controller');

router.get('/interactions/health', interactionController.placeholder);

module.exports = router;