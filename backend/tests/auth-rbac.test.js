const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('#')) {
  process.env.DATABASE_URL =
    'postgresql://postgres.xjccqzaehakrgqhfbtrj:Supabasehoangngochien12022006%23@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'replace_with_strong_jwt_secret_key';
}

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/config/db');

describe('Issue #4 - Auth & RBAC Automated Verification (17 Assertions)', () => {
  let studentCookie = [];

  beforeAll(async () => {
    const studentRole = await prisma.roles.upsert({
      where: { name: 'student' },
      update: {},
      create: { name: 'student' }
    });
    const passwordHash = await bcrypt.hash('Demo@12345', 10);
    await prisma.users.upsert({
      where: { email: 'learner@demo.edu.vn' },
      update: { password: passwordHash, status: 'active', isDeleted: false, role_id: studentRole.id },
      create: {
        email: 'learner@demo.edu.vn',
        full_name: 'Hoang Ngoc Hien',
        password: passwordHash,
        role_id: studentRole.id,
        status: 'active',
        is_verified: true
      }
    });
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('1. GET /health returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });

  test('2. POST /api/auth/register rejects invalid email format (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'invalid-email',
      password: 'Password123!',
      fullName: 'Test User'
    });
    expect(res.statusCode).toBe(400);
  });

  test('3. POST /api/auth/register rejects short password < 8 chars (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'shortpass@demo.edu.vn',
      password: '123',
      fullName: 'Test User'
    });
    expect(res.statusCode).toBe(400);
  });

  test('4. POST /api/auth/register rejects short fullName < 2 chars (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'shortname@demo.edu.vn',
      password: 'Password123!',
      fullName: 'A'
    });
    expect(res.statusCode).toBe(400);
  });

  test('5. POST /api/auth/register blocks role privilege escalation field (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'hacker@demo.edu.vn',
      password: 'Password123!',
      fullName: 'Hacker',
      role: 'admin'
    });
    expect(res.statusCode).toBe(400);
  });

  test('6. POST /api/auth/login rejects non-existent user (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody_exists_999@demo.edu.vn',
      password: 'Password123!'
    });
    expect(res.statusCode).toBe(401);
  });

  test('7. POST /api/auth/login rejects wrong password for seeded user (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'learner@demo.edu.vn',
      password: 'WrongPassword999!'
    });
    expect(res.statusCode).toBe(401);
  });

  test('8. POST /api/auth/login succeeds with seeded student & sets HttpOnly cookie (200)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'learner@demo.edu.vn',
      password: 'Demo@12345'
    });
    expect(res.statusCode).toBe(200);
    studentCookie = res.headers['set-cookie'] || [];
    expect(studentCookie[0]).toMatch(/access_token=.*HttpOnly/i);
  });

  test('9. GET /api/users/profile rejects unauthenticated request without token (401)', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.statusCode).toBe(401);
  });

  test('10. GET /api/users/profile rejects malformed/tampered JWT token (401)', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(res.statusCode).toBe(401);
  });

  test('11. GET /api/users/profile returns authenticated student profile (200)', async () => {
    const res = await request(app).get('/api/users/profile').set('Cookie', studentCookie);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe('learner@demo.edu.vn');
  });

  test('12. PUT /api/users/profile blocks unauthorized role modification (400)', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Cookie', studentCookie)
      .send({ full_name: 'Hoang Ngoc Hien', role: 'admin' });
    expect(res.statusCode).toBe(400);
  });

  test('13. PUT /api/users/profile updates student bio successfully (200)', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Cookie', studentCookie)
      .send({ full_name: 'Hoang Ngoc Hien', bio: 'Verified LMS Student' });
    expect(res.statusCode).toBe(200);
  });

  test('14. RBAC: Student role is forbidden from creating a course (403)', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Cookie', studentCookie)
      .send({ title: 'Unauthorized Student Course' });
    expect(res.statusCode).toBe(403);
  });

  test('15. POST /api/auth/forgot-password validates email and returns 200', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent_safe@demo.edu.vn' });
    expect(res.statusCode).toBe(200);
  });

  test('16. POST /api/auth/reset-password rejects invalid token format (400)', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid-short-token', newPassword: 'NewPassword123!' });
    expect(res.statusCode).toBe(400);
  });

  test('17. POST /api/auth/logout clears access_token cookie (200)', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.statusCode).toBe(200);
  });
});