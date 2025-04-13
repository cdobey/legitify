import cors from 'cors';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import './config/env';
import prisma from './prisma/client';
import indexRoutes from './routes/index';
import { initStorageBuckets } from './utils/storage/supabase-storage';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://legitify-project-client.onrender.com',
      'https://legitifyapp.com',
    ],
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
  res.send('TypeScript + Go Chaincode Degree API with Prisma');
});

app.use('/', indexRoutes);

// Start Server
const startServer = async () => {
  try {
    // Initializing Supabase storage buckets
    console.log('Initializing Supabase storage buckets...');
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

startServer();

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
