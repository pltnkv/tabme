import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { logError } from '../utils/logger';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    
    const user = await userService.validateSession(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined
    };

    next();
  } catch (error) {
    logError(error, 'Authentication middleware error');
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const user = await userService.validateSession(token);
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name || undefined
        };
      }
    }

    next();
  } catch (error) {
    logError(error, 'Optional authentication middleware error');
    // For optional auth, we don't fail on errors, just proceed without user
    next();
  }
}; 