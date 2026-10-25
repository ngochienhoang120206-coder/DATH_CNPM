import express from 'express';
import { assessmentController } from '../controllers/assessment.controller.js';

const assessmentRouter = express.Router();

assessmentRouter.get('/assessments/health', assessmentController.placeholder);

export default assessmentRouter;
