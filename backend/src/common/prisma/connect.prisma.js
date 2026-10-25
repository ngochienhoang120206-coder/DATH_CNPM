import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import prismaPkg from './generated/prisma/index.js';

const { PrismaClient } = prismaPkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres_password@localhost:5432/lms_db';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
export default prisma;
