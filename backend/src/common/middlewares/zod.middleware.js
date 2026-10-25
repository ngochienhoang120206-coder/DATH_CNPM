import { z } from "zod";
import { BadRequestException } from "../helpers/exception.helper.js";

export const validateRequest = (schema) => async (req, res, next) => {
    try {
        req.body = await schema.parseAsync(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
            return next(new BadRequestException(`Validation failed: ${errorMessages.join(', ')}`));
        }
        next(error);
    }
};

export default validateRequest;
