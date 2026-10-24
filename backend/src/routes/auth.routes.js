const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/users/profile', verifyToken, authController.getProfile);
router.get('/auth/socket-ticket', verifyToken, authController.issueSocketTicket);

module.exports = router;