const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { authSchema, validateRequest } = require('../schema/auth.schema');

router.post('/auth/register', validateRequest(authSchema.register), authController.register);
router.post('/auth/login', validateRequest(authSchema.login), authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/forgot-password', validateRequest(authSchema.forgotPassword), authController.forgotPassword);
router.post('/auth/reset-password', validateRequest(authSchema.resetPassword), authController.resetPassword);

router.get('/users/profile', verifyToken, authController.getProfile);
router.put('/users/profile', verifyToken, validateRequest(authSchema.updateProfile), authController.updateProfile);
router.get('/auth/socket-ticket', verifyToken, authController.issueSocketTicket);

module.exports = router;