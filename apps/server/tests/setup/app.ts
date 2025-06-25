import express, { Request, Response } from 'express';
import cors from 'cors';

// Routes
import authRoutes from '../../src/routes/auth.routes';
import userRoutes from '../../src/routes/user.routes';
import spaceRoutes from '../../src/routes/space.routes';
import folderRoutes from '../../src/routes/folder.routes';
import itemRoutes from '../../src/routes/item.routes';
import syncRoutes from '../../src/routes/sync.routes';

// Middleware
import { errorHandler } from '../../src/middleware/errorHandler.middleware';

export const createTestApp = () => {
  const app = express();

  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    console.log('health')
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/spaces', spaceRoutes);
  app.use('/api/folders', folderRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/sync', syncRoutes);

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({ 
      error: 'Route not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}; 