import express from 'express';
import { interactionController } from '../controllers/interaction.controller.js';

const interactionRouter = express.Router();

interactionRouter.get('/interactions/health', interactionController.placeholder);

export default interactionRouter;
