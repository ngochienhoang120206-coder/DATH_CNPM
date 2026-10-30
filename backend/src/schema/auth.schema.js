const { z } = require('zod');

const authSchema = {
  register: z.object({
    email: z.string().trim().email('Invalid email address').transform((v) => v.toLowerCase()),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(255)
  }).strict(),

  login: z.object({
    email: z.string().trim().email('Invalid email address').transform((v) => v.toLowerCase()),
    password: z.string().min(1, 'Password is required')
  }),

  updateProfile: z.object({
    full_name: z.string().trim().min(2).max(255).optional(),
    fullName: z.string().trim().min(2).max(255).optional(),
    avatar_url: z.string().trim().url().max(500).nullable().optional(),
    avatarUrl: z.string().trim().url().max(500).nullable().optional(),
    bio: z.string().trim().max(5000).nullable().optional()
  }).strict().refine((val) => Object.keys(val).length > 0, {
    message: 'At least one field is required to update'
  }),

  forgotPassword: z.object({
    email: z.string().trim().email('Invalid email address').transform((v) => v.toLowerCase())
  }),

  resetPassword: z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid password reset token'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters')
  })
};

const validateRequest = (schema) => async (req, res, next) => {
  try {
    req.body = await schema.parseAsync(req.body);
    return next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      return res.status(400).json({ success: false, message: `Validation failed: ${msg}` });
    }
    return next(err);
  }
};

module.exports = { authSchema, validateRequest };