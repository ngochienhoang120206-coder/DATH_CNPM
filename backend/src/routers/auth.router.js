import express from 'express';
import { authController } from '../controllers/auth.controller.js';
import { verifyToken } from '../common/middlewares/auth.middleware.js';
import { validateRequest } from '../common/middlewares/zod.middleware.js';
import { authSchema } from '../common/schema/auth.schema.js';
import rateLimit from 'express-rate-limit';

const authRouter = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 10), standardHeaders: true, legacyHeaders: false });
const passwordResetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX || 5), standardHeaders: true, legacyHeaders: false });

authRouter.post('/auth/register', authLimiter, validateRequest(authSchema.register), authController.register);
authRouter.post('/auth/login', authLimiter, validateRequest(authSchema.login), authController.login);
authRouter.post('/auth/forgot-password', passwordResetLimiter, validateRequest(authSchema.forgotPassword), authController.forgotPassword);
authRouter.post('/auth/reset-password', passwordResetLimiter, validateRequest(authSchema.resetPassword), authController.resetPassword);
authRouter.post('/auth/logout', authController.logout);
authRouter.get('/users/profile', verifyToken, authController.getProfile);
authRouter.put('/users/profile', verifyToken, validateRequest(authSchema.updateProfile), authController.updateProfile);
authRouter.get('/auth/socket-ticket', verifyToken, authController.issueSocketTicket);

export default authRouter;
