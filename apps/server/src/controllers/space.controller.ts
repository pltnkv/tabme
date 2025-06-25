import { Request, Response } from 'express';
import spaceService from '../services/space.service';
import { validationResult } from 'express-validator';

class SpaceController {
  async getUserSpaces(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const spaces = await spaceService.getUserSpaces(userId);
      res.json(spaces);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get spaces' });
    }
  }

  async getSpaceById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { spaceId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const space = await spaceService.getSpaceById(spaceId, userId);
      if (!space) {
        res.status(404).json({ error: 'Space not found or access denied' });
        return;
      }

      res.json(space);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get space' });
    }
  }

  async createSpace(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { title, position } = req.body;
      const space = await spaceService.createSpace(userId, { title, position });
      res.status(201).json(space);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create space' });
    }
  }

  async updateSpace(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      const { spaceId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { title } = req.body;
      const space = await spaceService.updateSpace(spaceId, userId, { title });
      
      if (!space) {
        res.status(404).json({ error: 'Space not found or access denied' });
        return;
      }

      res.json(space);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update space' });
    }
  }

  async deleteSpace(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { spaceId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await spaceService.deleteSpace(spaceId, userId);
      res.json({ message: 'Space deleted successfully' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete space' });
      }
    }
  }

  async updateSpacePositions(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { positions } = req.body; // Array of { spaceId, position }
      await spaceService.updateUserSpacePositions(userId, positions);
      res.json({ message: 'Space positions updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update space positions' });
    }
  }

  async addUserToSpace(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      const { spaceId } = req.params;
      const { targetUserId, position } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userPosition = await spaceService.addUserToSpace(spaceId, targetUserId, position);
      res.status(201).json(userPosition);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to add user to space' });
      }
    }
  }

  async removeUserFromSpace(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { spaceId, targetUserId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await spaceService.removeUserFromSpace(spaceId, targetUserId, userId);
      res.json({ message: 'User removed from space successfully' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('owner')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to remove user from space' });
      }
    }
  }

  async getSpaceUsers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { spaceId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const users = await spaceService.getSpaceUsers(spaceId, userId);
      res.json(users);
    } catch (error) {
      if (error instanceof Error && error.message.includes('denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get space users' });
      }
    }
  }
}

export default new SpaceController(); 