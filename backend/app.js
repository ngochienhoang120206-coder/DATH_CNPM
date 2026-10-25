import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import rootRouter from './src/routers/root.router.js';
import { appError } from './src/common/helpers/app-error.helper.js';
import { logApi } from './src/common/middlewares/log-api.middleware.js';
import { metricsEndpoint } from './src/common/helpers/metrics.helper.js';
import { swaggerDocument } from './src/common/swagger/init.swagger.js';

const app = express();

export const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173'
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(helmet({ crossOriginResourcePolicy: false }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút.'
});
app.use(limiter);

app.get('/metrics', metricsEndpoint);

app.use(express.json());
app.use(cookieParser());
app.use(logApi('dev'));
app.use(express.static('public'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', rootRouter);

app.use(appError);

export default app;
