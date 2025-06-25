import { Request, Response } from 'express';
import userService from '../services/user.service';
import { validationResult } from 'express-validator';

class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, name } = req.body;
      const user = await userService.createUser({ email, password, name });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to register user' });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;
      const { user, token } = await userService.authenticateUser({ email, password });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword, 
        token,
        message: 'Login successful'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid credentials')) {
        res.status(401).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to login' });
      }
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        res.status(400).json({ error: 'Token required for logout' });
        return;
      }

      await userService.logout(token);
      res.json({ message: 'Logout successful' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to logout' });
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user data' });
    }
  }

  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        res.status(400).json({ error: 'Token required' });
        return;
      }

      const user = await userService.validateSession(token);
      if (!user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json({ 
        valid: true, 
        user: userWithoutPassword 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to validate token' });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Generate new token by re-authenticating
      const { token } = await userService.authenticateUser({ 
        email: user.email, 
        password: '' // This would need to be handled differently in production
      });

      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }
}

export default new AuthController(); 