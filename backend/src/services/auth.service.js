const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const prisma = require('../config/db');
const redis = require('../config/redis');

const getJwtSecret = () => process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'replace_with_strong_jwt_secret_key';

async function sendResetEmail(email, rawToken) {
  if (!process.env.SMTP_HOST) return;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 1025),
    secure: process.env.SMTP_SECURE === 'true',
    ...(process.env.SMTP_USER && process.env.SMTP_PASS
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
      : {})
  });

  const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  await transport.sendMail({
    from: process.env.MAIL_FROM || 'LMS <no-reply@lms.local>',
    to: email,
    subject: 'Password Reset Request',
    text: `Use the following link to reset your password within 15 minutes: ${resetUrl}`,
    html: `<p>Use the link below to reset your password (expires in 15 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
}

const authService = {
  async register({ email, fullName, password }) {
    const existing = await prisma.users.findFirst({ where: { email } });
    if (existing) {
      const err = new Error('Email is already registered');
      err.statusCode = 409;
      throw err;
    }

    const role = await prisma.roles.findFirst({ where: { name: 'student', isDeleted: false } });
    if (!role) {
      const err = new Error('Default student role not found');
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        email,
        full_name: fullName,
        password: hashedPassword,
        role_id: role.id
      }
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      full_name: user.full_name,
      role: role.name
    };
  },

  async login({ email, password }) {
    const user = await prisma.users.findFirst({
      where: { email, isDeleted: false },
      include: { role: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    if (user.status === 'banned') {
      const err = new Error('Account has been banned');
      err.statusCode = 403;
      throw err;
    }

    const payload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      full_name: user.full_name,
      role: user.role.name
    };

    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
    return { token, payload };
  },

  async getProfile(userId) {
    const user = await prisma.users.findFirst({
      where: { id: userId, isDeleted: false },
      include: { role: { select: { id: true, name: true } } }
    });

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      full_name: user.full_name,
      avatarUrl: user.avatar_url,
      avatar_url: user.avatar_url,
      bio: user.bio,
      status: user.status,
      role: user.role.name,
      roleDetails: user.role
    };
  },

  async updateProfile(userId, changes) {
    const data = {};
    const resolvedName = changes.full_name ?? changes.fullName;
    const resolvedAvatar = changes.avatar_url !== undefined ? changes.avatar_url : changes.avatarUrl;

    if (resolvedName !== undefined) data.full_name = resolvedName;
    if (resolvedAvatar !== undefined) data.avatar_url = resolvedAvatar;
    if (changes.bio !== undefined) data.bio = changes.bio;

    const user = await prisma.users.update({
      where: { id: userId },
      data,
      include: { role: { select: { id: true, name: true } } }
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      full_name: user.full_name,
      avatarUrl: user.avatar_url,
      avatar_url: user.avatar_url,
      bio: user.bio,
      status: user.status,
      role: user.role.name
    };
  },

  async requestPasswordReset(email) {
    const user = await prisma.users.findFirst({
      where: { email, isDeleted: false, status: 'active' }
    });
    if (!user) return null;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const resetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.users.update({
      where: { id: user.id },
      data: { reset_token: resetToken, reset_token_expiry: resetTokenExpiry }
    });

    await sendResetEmail(user.email, rawToken);
    return rawToken;
  },

  async resetPassword(rawToken, newPassword) {
    const resetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await prisma.users.findFirst({
      where: {
        reset_token: resetToken,
        reset_token_expiry: { gt: new Date() },
        isDeleted: false,
        status: 'active'
      }
    });

    if (!user) {
      const err = new Error('Invalid or expired password reset token');
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null
      }
    });
  },

  async issueSocketTicket(user) {
    const ticket = crypto.randomUUID();
    await redis.set(`socket_ticket:${ticket}`, JSON.stringify(user), 'EX', 30);
    return ticket;
  }
};

module.exports = authService;