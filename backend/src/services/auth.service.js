import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../common/prisma/connect.prisma.js';
import redis from '../common/redis/connect.redis.js';
import { tokenService } from './token.service.js';
import { sendPasswordResetEmail, isEmailConfigured } from './email.service.js';
import { ServiceUnavailableException } from '../common/helpers/exception.helper.js';

export const authService = {
  async register({ email, fullName, password }) {
    const role = await prisma.roles.findFirst({ where: { name: 'student', isDeleted: false } });
    if (!role) {
      const error = new Error('Invalid role');
      error.statusCode = 400;
      throw error;
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
      role: role.name
    };
  },

  async login({ email, password }) {
    const user = await prisma.users.findFirst({
      where: { email, isDeleted: false },
      include: { role: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }
    if (user.status === 'banned') {
      const error = new Error('Account has been banned');
      error.statusCode = 403;
      throw error;
    }

    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role.name
    };
    const token = tokenService.createAccessToken(user.id, user.role.name);

    return { token, payload };
  },

  async getProfile(userId) {
    const user = await prisma.users.findFirst({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        bio: true,
        status: true,
        createdAt: true,
        role: { select: { id: true, name: true } }
      }
    });

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return user;
  },

  async updateProfile(userId, changes) {
    const data = {};
    if (changes.full_name !== undefined) data.full_name = changes.full_name;
    if (changes.avatar_url !== undefined) data.avatar_url = changes.avatar_url;
    if (changes.bio !== undefined) data.bio = changes.bio;

    const user = await prisma.users.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        bio: true,
        status: true,
        updatedAt: true,
        role: { select: { id: true, name: true } }
      }
    });
    return user;
  },

  async requestPasswordReset(email) {
    if (!isEmailConfigured()) {
      throw new ServiceUnavailableException('Dịch vụ gửi email chưa được cấu hình');
    }

    const user = await prisma.users.findFirst({
      where: { email, isDeleted: false, status: 'active' },
      select: { id: true, email: true }
    });
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const resetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.users.update({
      where: { id: user.id },
      data: { reset_token: resetToken, reset_token_expiry: resetTokenExpiry }
    });

    try {
      await sendPasswordResetEmail(user.email, rawToken);
    } catch (error) {
      await prisma.users.updateMany({
        where: { id: user.id, reset_token: resetToken },
        data: { reset_token: null, reset_token_expiry: null }
      });
      console.error('[Auth] Password reset email delivery failed');
      throw new ServiceUnavailableException('Không thể gửi email đặt lại mật khẩu');
    }
  },

  async resetPassword(rawToken, newPassword) {
    const resetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await prisma.users.findFirst({
      where: {
        reset_token: resetToken,
        reset_token_expiry: { gt: new Date() },
        isDeleted: false,
        status: 'active'
      },
      select: { id: true }
    });

    if (!user) {
      const error = new Error('Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const consumed = await prisma.users.updateMany({
      where: {
        id: user.id,
        reset_token: resetToken,
        reset_token_expiry: { gt: new Date() },
        isDeleted: false,
        status: 'active'
      },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null
      }
    });
    if (consumed.count !== 1) {
      const error = new Error('Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
      error.statusCode = 400;
      throw error;
    }
  },

  async issueSocketTicket(user) {
    const ticket = crypto.randomUUID();
    await redis.set(`socket_ticket:${ticket}`, JSON.stringify(user), 'EX', 30);
    return ticket;
  }
};

export default authService;
