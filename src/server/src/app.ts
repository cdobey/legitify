import cors from 'cors';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import './config/env';
import prisma from './prisma/client';
import indexRoutes from './routes/index';
import { initStorageBuckets } from './utils/storage/db-storage';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost',
  'https://legitify.dobey.dev',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 24 hours
  }),
);

app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  // Skip JSON/URL-encoded parsing for multipart requests (handled by multer)
  if (contentType.includes('multipart/form-data')) {
    console.log('Detected multipart request, skipping JSON/URL-encoded parsing');
    return next();
  }

  // For non-multipart requests, we just apply the standard parsers
  express.json({ limit: '5mb' })(req, res, err => {
    if (err) return next(err);
    express.urlencoded({ limit: '5mb', extended: true })(req, res, next);
  });
});

app.use(morgan('dev'));

// Basic test route
app.get('/', (req: Request, res: Response) => {
  res.send('TypeScript + Go Chaincode Credential API with Prisma');
});

// Health check for orchestration (returns 200 when the app is ready)
app.get('/health', async (req: Request, res: Response) => {
  // Keep this lightweight and avoid depending on DB or other services.
  // If you want a deeper check, you can probe Prisma or other deps here.
  res.status(200).json({ status: 'ok' });
});
app.use('/', indexRoutes);

// Start Server
const startServer = async () => {
  try {
    // Initialize storage (DB-based, no-op but kept for API compatibility)
    console.log('Initializing database storage...');
    await initStorageBuckets();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start the server if this file is run directly (not imported)
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  startServer();
}

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
