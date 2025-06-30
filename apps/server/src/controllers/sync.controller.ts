import { Request, Response } from 'express';
import syncService from '../services/sync.service';
import { validationResult } from 'express-validator';
import { logError } from '../utils/logger';

class SyncController {
  async getFullSyncData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const fullData = await syncService.getFullSyncData(userId);
      res.json(fullData);
    } catch (error) {
      logError(error, 'Failed to get full sync data');
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get sync data' });
      }
    }
  }

  async getSyncChanges(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { lastSyncVersion, entityTypes } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const lastVersion = lastSyncVersion ? parseInt(lastSyncVersion as string) : 0;
      const entityTypeArray = entityTypes ? (entityTypes as string).split(',') : undefined;

      const syncResponse = await syncService.getSyncChanges(userId, lastVersion, entityTypeArray);
      res.json(syncResponse);
    } catch (error) {
      logError(error, 'Failed to get sync changes');
      res.status(500).json({ error: 'Failed to get sync changes' });
    }
  }

  async applySyncChanges(req: Request, res: Response): Promise<void> {
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

      const { changes } = req.body;
      const result = await syncService.applySyncChanges(userId, changes);
      
      if (result.success) {
        res.json({ message: 'Sync changes applied successfully', errors: result.errors });
      } else {
        res.status(400).json({ error: 'Some changes failed to apply', errors: result.errors });
      }
    } catch (error) {
      logError(error, 'Failed to apply sync changes');
      res.status(500).json({ error: 'Failed to apply sync changes' });
    }
  }

  async createSyncLog(req: Request, res: Response): Promise<void> {
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

      const syncData = req.body;
      const syncLog = await syncService.createSyncLog(userId, syncData);
      res.status(201).json(syncLog);
    } catch (error) {
      logError(error, 'Failed to create sync log');
      res.status(500).json({ error: 'Failed to create sync log' });
    }
  }

  async getUserSyncStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await syncService.getUserSyncStats(userId);
      res.json(stats);
    } catch (error) {
      logError(error, 'Failed to get user sync stats');
      res.status(500).json({ error: 'Failed to get sync stats' });
    }
  }

  // Admin endpoint for cleanup
  async cleanupOldSyncLogs(req: Request, res: Response): Promise<void> {
    try {
      const { daysToKeep } = req.query;
      const days = daysToKeep ? parseInt(daysToKeep as string) : 30;

      const deletedCount = await syncService.cleanupOldSyncLogs(days);
      res.json({ message: `Cleaned up ${deletedCount} old sync logs` });
    } catch (error) {
      logError(error, 'Failed to cleanup old sync logs');
      res.status(500).json({ error: 'Failed to cleanup sync logs' });
    }
  }
}

export default new SyncController(); 