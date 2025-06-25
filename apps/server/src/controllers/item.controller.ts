import { Request, Response } from 'express';
import itemService from '../services/item.service';
import { validationResult } from 'express-validator';

class ItemController {
  async getFolderItems(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { folderId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const items = await itemService.getFolderItems(folderId, userId);
      res.json(items);
    } catch (error) {
      if (error instanceof Error && error.message.includes('denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get items' });
      }
    }
  }

  async getItemById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const item = await itemService.getItemById(itemId, userId);
      if (!item) {
        res.status(404).json({ error: 'Item not found or access denied' });
        return;
      }

      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get item' });
    }
  }

  async createItem(req: Request, res: Response): Promise<void> {
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

      const { title, url, favicon, position, folderId } = req.body;
      const item = await itemService.createItem(userId, { title, url, favicon, position, folderId });
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof Error && error.message.includes('denied')) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create item' });
      }
    }
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      const { itemId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { title, url, favicon, position } = req.body;
      const item = await itemService.updateItem(itemId, userId, { title, url, favicon, position });
      
      if (!item) {
        res.status(404).json({ error: 'Item not found or access denied' });
        return;
      }

      res.json(item);
    } catch (error) {
      if (error instanceof Error && error.message.includes('denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update item' });
      }
    }
  }

  async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await itemService.deleteItem(itemId, userId);
      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes('denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete item' });
      }
    }
  }

  async moveItem(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      const { itemId } = req.params;
      const { targetFolderId, position } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const item = await itemService.moveItem(itemId, userId, targetFolderId, position);
      res.json(item);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes('denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to move item' });
      }
    }
  }

  async bulkUpdatePositions(req: Request, res: Response): Promise<void> {
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

      const { updates } = req.body; // Array of { id, position }
      await itemService.bulkUpdateItemPositions(userId, updates);
      res.json({ message: 'Item positions updated successfully' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update item positions' });
      }
    }
  }

  async searchItems(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { q: query } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const items = await itemService.searchItems(userId, query);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search items' });
    }
  }

  async getRecentlyUsedItems(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limitNum = limit ? parseInt(limit as string) : 20;
      const items = await itemService.getRecentlyUsedItems(userId, limitNum);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get recently used items' });
    }
  }

  async markItemAsUsed(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await itemService.markItemAsUsed(itemId, userId);
      res.json({ message: 'Item marked as used' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark item as used' });
    }
  }
}

export default new ItemController(); 