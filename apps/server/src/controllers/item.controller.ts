import { Request, Response } from 'express';
import itemService from '../services/item.service';
import { validationResult } from 'express-validator';
import { logError } from '../utils/logger';

class ItemController {
  async getFolderItems(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { folderId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!folderId) {
        res.status(400).json({ error: "folderId should be provided" })
        return
      }

      const items = await itemService.getFolderItems(folderId, userId);
      res.json(items);
    } catch (error) {
      logError(error, `Failed to get folder items: ${req.params.folderId}`);
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

      if (!itemId) {
        res.status(400).json({ error: "itemId should be provided" })
        return
      }

      const item = await itemService.getItemById(itemId, userId);
      if (!item) {
        res.status(404).json({ error: 'Item not found or access denied' });
        return;
      }

      res.json(item);
    } catch (error) {
      logError(error, `Failed to get item by ID: ${req.params.itemId}`);
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
      logError(error, 'Failed to create item');
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

      if (!itemId) {
        res.status(400).json({ error: "itemId should be provided" })
        return
      }

      const { title, url, favicon, position } = req.body;
      const item = await itemService.updateItem(itemId, userId, { title, url, favicon, position });
      
      if (!item) {
        res.status(404).json({ error: 'Item not found or access denied' });
        return;
      }

      res.json(item);
    } catch (error) {
      logError(error, `Failed to update item: ${req.params.itemId}`);
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

      if (!itemId) {
        res.status(400).json({ error: "itemId should be provided" })
        return
      }

      await itemService.deleteItem(itemId, userId);
      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      logError(error, `Failed to delete item: ${req.params.itemId}`);
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

      if (!itemId) {
        res.status(400).json({ error: "itemId should be provided" })
        return
      }

      const item = await itemService.moveItem(itemId, userId, targetFolderId, position);
      res.json(item);
    } catch (error) {
      logError(error, `Failed to move item: ${req.params.itemId}`);
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
      logError(error, 'Failed to bulk update item positions');
      if (error instanceof Error && error.message.includes('denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update item positions' });
      }
    }
  }
}

export default new ItemController(); 