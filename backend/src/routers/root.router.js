import express from 'express';
import authRouter from './auth.router.js';
import courseRouter from './course.router.js';
import enrollmentRouter from './enrollment.router.js';
import assessmentRouter from './assessment.router.js';
import interactionRouter from './interaction.router.js';

const rootRouter = express.Router();

rootRouter.use(authRouter);
rootRouter.use(courseRouter);
rootRouter.use(enrollmentRouter);
rootRouter.use(assessmentRouter);
rootRouter.use(interactionRouter);

export default rootRouter;
