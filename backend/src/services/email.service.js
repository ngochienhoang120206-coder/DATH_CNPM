import nodemailer from 'nodemailer';

const smtpConfig = () => {
  const config = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true'
  };
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    config.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  }
  return config;
};

export function isEmailConfigured() {
  const config = smtpConfig();
  const hasPartialAuth = Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASS);
  return Boolean(config.host && !hasPartialAuth && process.env.MAIL_FROM && (process.env.FRONTEND_URL || process.env.CLIENT_URL));
}

export async function sendPasswordResetEmail(email, token) {
  if (!isEmailConfigured()) throw new Error('Email transport is not configured');

  const transport = nodemailer.createTransport(smtpConfig());
  const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
  const resetUrl = new URL('/reset-password', frontendUrl);
  resetUrl.searchParams.set('token', token);

  await transport.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Đặt lại mật khẩu tài khoản DATH',
    text: `Dùng liên kết sau để đặt lại mật khẩu trong vòng 15 phút: ${resetUrl.toString()}`,
    html: `<p>Dùng liên kết dưới đây để đặt lại mật khẩu. Liên kết hết hạn sau 15 phút.</p><p><a href="${resetUrl.toString()}">Đặt lại mật khẩu</a></p>`
  });
}
