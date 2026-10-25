import 'dotenv/config';
import bcrypt from 'bcrypt';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import newman from 'newman';
import prisma from '../src/common/prisma/connect.prisma.js';
import { tokenService } from '../src/services/token.service.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const postmanDir = path.join(scriptDir, '..', 'postman');
const collectionPath = path.join(postmanDir, 'auth.postman_collection.json');
const reportDir = path.join(postmanDir, 'reports');
const reportPath = path.join(reportDir, 'auth-test.log');
const localEnvironmentPath = path.join(postmanDir, 'auth.local.postman_environment.json');
const runEnvironmentPath = path.join(postmanDir, 'auth.run.postman_environment.json');
const bannedEmail = 'postman-banned@dath.local';
const bannedPassword = 'Banned-Postman-Only-123!';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to prepare Postman fixtures in production');
}
if (!process.env.DATABASE_URL) {
  throw new Error('Set DATABASE_URL in backend/.env before running the Auth collection');
}

async function waitFor(url, label) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${label} did not become ready at ${url}`);
}

function writeEnvironment(filePath, values) {
  return fs.writeFile(filePath, JSON.stringify({
    id: 'dath-auth-postman-local',
    name: 'DATH Auth Local (generated)',
    values: Object.entries(values).map(([key, value]) => ({ key, value, type: 'default', enabled: true })),
    _postman_variable_scope: 'environment',
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: 'DATH Auth Postman runner'
  }, null, 2));
}

async function writeRunLog(summary) {
  const run = summary.run;
  const executions = run.executions || [];
  const lines = [
    'DATH Auth API acceptance tests',
    `Finished: ${new Date().toISOString()}`,
    `Requests: ${run.stats.requests.total}; failures: ${run.stats.requests.failed}`,
    `Assertions: ${run.stats.assertions.total}; failures: ${run.stats.assertions.failed}`,
    ''
  ];

  for (const execution of executions) {
    const assertions = execution.assertions || [];
    const failures = assertions.filter((assertion) => assertion.error);
    const status = execution.response?.code ?? 'NO_RESPONSE';
    const responseTime = execution.response?.responseTime ?? 'N/A';
    const result = failures.length ? 'FAIL' : 'PASS';
    lines.push(`${result} | ${execution.item.name} | HTTP ${status} | ${responseTime} ms | ${assertions.length - failures.length}/${assertions.length} assertions`);
    for (const failure of failures) {
      lines.push(`  Assertion failed: ${failure.assertion}`);
      if (failure.error?.message) lines.push(`  ${failure.error.message}`);
    }
  }

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Sanitized test log saved to ${reportPath}`);
}

async function prepareBannedFixture() {
  const role = await prisma.roles.upsert({
    where: { name: 'student' },
    update: { isDeleted: false, deletedAt: null },
    create: { name: 'student' }
  });

  const passwordHash = await bcrypt.hash(bannedPassword, 10);
  const user = await prisma.users.upsert({
    where: { email: bannedEmail },
    update: {
      full_name: 'Postman Banned Fixture',
      password: passwordHash,
      role_id: role.id,
      status: 'banned',
      isDeleted: false,
      deletedAt: null
    },
    create: {
      email: bannedEmail,
      full_name: 'Postman Banned Fixture',
      password: passwordHash,
      role_id: role.id,
      status: 'banned'
    },
    select: { id: true }
  });

  const bannedAccessToken = tokenService.createAccessToken(user.id, 'student');
  await writeEnvironment(localEnvironmentPath, {
    baseUrl: process.env.POSTMAN_BASE_URL || 'http://localhost:5000',
    mailpitUrl: process.env.MAILPIT_URL || 'http://localhost:8025',
    expectSecure: process.env.POSTMAN_EXPECT_SECURE || 'true',
    initialPassword: 'Initial-Postman-Pass-123!',
    newPassword: 'Changed-Postman-Pass-456!',
    bannedEmail,
    bannedPassword,
    bannedAccessToken
  });
}

async function runCollection() {
  await waitFor(`${process.env.POSTMAN_BASE_URL || 'http://localhost:5000'}/api/health`, 'Backend');
  await waitFor(`${process.env.MAILPIT_URL || 'http://localhost:8025'}/api/v1/messages`, 'Mailpit');

  const summary = await new Promise((resolve, reject) => {
    newman.run({
      collection: collectionPath,
      environment: localEnvironmentPath,
      exportEnvironment: runEnvironmentPath,
      reporters: ['cli'],
      timeoutRequest: 15000,
      timeoutScript: 10000
    }, (error, result) => error ? reject(error) : resolve(result));
  });

  await writeRunLog(summary);

  if (summary.run.failures.length > 0) {
    throw new Error(`${summary.run.failures.length} Postman assertion(s) failed`);
  }

  const exportedEnvironment = JSON.parse(await fs.readFile(runEnvironmentPath, 'utf8'));
  const email = exportedEnvironment.values.find((value) => value.key === 'testEmail')?.value;
  const user = await prisma.users.findFirst({
    where: { email, isDeleted: false },
    select: { password: true, role: { select: { name: true } } }
  });
  if (!user || user.password === 'Changed-Postman-Pass-456!' || !user.password.startsWith('$2')) {
    throw new Error('Database password hash verification failed');
  }
  if (!await bcrypt.compare('Changed-Postman-Pass-456!', user.password)
    || await bcrypt.compare('Initial-Postman-Pass-123!', user.password)
    || user.role.name !== 'student') {
    throw new Error('Database registration data verification failed');
  }

  console.log('Postman Auth collection and PostgreSQL password-hash checks passed.');
}

try {
  await prepareBannedFixture();
  await runCollection();
} finally {
  try {
    const exportedEnvironment = JSON.parse(await fs.readFile(runEnvironmentPath, 'utf8'));
    const email = exportedEnvironment.values.find((value) => value.key === 'testEmail')?.value;
    if (typeof email === 'string' && /^postman-\d+@example\.test$/.test(email)) {
      await prisma.users.updateMany({
        where: { email, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() }
      });
    }
  } catch {}
  await prisma.$disconnect();
}
