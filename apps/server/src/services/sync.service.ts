import prisma from '../config/db';
import { SyncLog } from '@prisma/client';
import { logError } from '../utils/logger';

export interface SyncData {
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  entityType: string;
  entityId: string;
  data?: any;
  version?: number;
}

export interface SyncResponse {
  lastSyncVersion: number;
  changes: SyncLog[];
  conflicts?: any[];
}

class SyncService {
  async createSyncLog(userId: string, syncData: SyncData): Promise<SyncLog> {
    return await prisma.syncLog.create({
      data: {
        userId,
        operation: syncData.operation,
        entityType: syncData.entityType,
        entityId: syncData.entityId,
        version: syncData.version || 1,
        data: syncData.data
      }
    });
  }

  async getSyncChanges(userId: string, lastSyncVersion: number, entityTypes?: string[]): Promise<SyncResponse> {
    const whereClause: any = {
      userId,
      version: { gt: lastSyncVersion }
    };

    if (entityTypes && entityTypes.length > 0) {
      whereClause.entityType = { in: entityTypes };
    }

    const changes = await prisma.syncLog.findMany({
      where: whereClause,
      orderBy: [
        { version: 'asc' },
        { timestamp: 'asc' }
      ]
    });

    const latestVersion = changes.length > 0 
      ? Math.max(...changes.map(c => c.version))
      : lastSyncVersion;

    return {
      lastSyncVersion: latestVersion,
      changes,
      conflicts: [] // TODO: Implement conflict detection
    };
  }

  async getFullSyncData(userId: string): Promise<any> {
    // Get all user data for full sync
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        spaces: {
          include: {
            folders: {
              include: {
                items: true
              }
            },
            stickyNotes: true
          }
        },
        spacePositions: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        settings: user.settings
      },
      spaces: user.spaces,
      spacePositions: user.spacePositions
    };
  }

  async applySyncChanges(userId: string, changes: SyncData[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let success = true;

    for (const change of changes) {
      try {
        await this.applySingleChange(userId, change);
        
        // Log the sync operation
        await this.createSyncLog(userId, change);
      } catch (error) {
        logError(error, `Failed to apply sync change for ${change.entityType}:${change.entityId}`);
        success = false;
        errors.push(`Failed to apply change for ${change.entityType}:${change.entityId} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, errors };
  }

  private async applySingleChange(userId: string, change: SyncData): Promise<void> {
    const { operation, entityType, entityId, data } = change;

    switch (entityType) {
      case 'space':
        await this.applySyncToSpace(userId, operation, entityId, data);
        break;
      case 'folder':
        await this.applySyncToFolder(userId, operation, entityId, data);
        break;
      case 'item':
        await this.applySyncToItem(userId, operation, entityId, data);
        break;
      case 'sticky_note':
        await this.applySyncToStickyNote(userId, operation, entityId, data);
        break;
      case 'user_space_position':
        await this.applySyncToUserSpacePosition(userId, operation, entityId, data);
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private async applySyncToSpace(userId: string, operation: string, entityId: string, data: any): Promise<void> {
    switch (operation) {
      case 'CREATE':
        await prisma.space.create({
          data: {
            id: entityId,
            userId,
            title: data.title
          }
        });
        break;
      case 'UPDATE':
        await prisma.space.update({
          where: { id: entityId },
          data: {
            title: data.title
          }
        });
        break;
      case 'DELETE':
        await prisma.space.delete({
          where: { id: entityId }
        });
        break;
    }
  }

  private async applySyncToFolder(userId: string, operation: string, entityId: string, data: any): Promise<void> {
    switch (operation) {
      case 'CREATE':
        await prisma.folder.create({
          data: {
            id: entityId,
            spaceId: data.spaceId,
            title: data.title,
            color: data.color,
            position: data.position
          }
        });
        break;
      case 'UPDATE':
        // Build update data dynamically to include spaceId if provided
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.color !== undefined) updateData.color = data.color;
        if (data.position !== undefined) updateData.position = data.position;
        if (data.spaceId !== undefined) updateData.spaceId = data.spaceId;

        await prisma.folder.update({
          where: { id: entityId },
          data: updateData
        });
        break;
      case 'DELETE':
        await prisma.folder.delete({
          where: { id: entityId }
        });
        break;
    }
  }

  private async applySyncToItem(userId: string, operation: string, entityId: string, data: any): Promise<void> {
    switch (operation) {
      case 'CREATE':
        await prisma.item.create({
          data: {
            id: entityId,
            folderId: data.folderId,
            title: data.title,
            url: data.url,
            favicon: data.favicon,
            position: data.position
          }
        });
        break;
      case 'UPDATE':
        await prisma.item.update({
          where: { id: entityId },
          data: {
            title: data.title,
            url: data.url,
            favicon: data.favicon,
            position: data.position
          }
        });
        break;
      case 'DELETE':
        await prisma.item.delete({
          where: { id: entityId }
        });
        break;
    }
  }

  private async applySyncToStickyNote(userId: string, operation: string, entityId: string, data: any): Promise<void> {
    switch (operation) {
      case 'CREATE':
        await prisma.stickyNote.create({
          data: {
            id: entityId,
            spaceId: data.spaceId,
            content: data.content,
            positionX: data.positionX,
            positionY: data.positionY,
            position: data.position,
            color: data.color
          }
        });
        break;
      case 'UPDATE':
        await prisma.stickyNote.update({
          where: { id: entityId },
          data: {
            content: data.content,
            positionX: data.positionX,
            positionY: data.positionY,
            position: data.position,
            color: data.color
          }
        });
        break;
      case 'DELETE':
        await prisma.stickyNote.delete({
          where: { id: entityId }
        });
        break;
    }
  }

  private async applySyncToUserSpacePosition(userId: string, operation: string, entityId: string, data: any): Promise<void> {
    switch (operation) {
      case 'CREATE':
      case 'UPDATE':
        await prisma.userSpacePosition.upsert({
          where: {
            userId_spaceId: {
              userId,
              spaceId: data.spaceId
            }
          },
          create: {
            userId,
            spaceId: data.spaceId,
            position: data.position
          },
          update: {
            position: data.position
          }
        });
        break;
      case 'DELETE':
        await prisma.userSpacePosition.delete({
          where: {
            userId_spaceId: {
              userId,
              spaceId: data.spaceId
            }
          }
        });
        break;
    }
  }

  async getUserSyncStats(userId: string): Promise<any> {
    const totalLogs = await prisma.syncLog.count({
      where: { userId }
    });

    const recentLogs = await prisma.syncLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    // const lastSyncAt = recentLogs.length > 0 ? recentLogs[0].timestamp : null;

    return {
      totalSyncOperations: totalLogs,
      // lastSyncAt,
      recentOperations: recentLogs
    };
  }

  async cleanupOldSyncLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.syncLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate }
      }
    });

    return result.count;
  }
}

export default new SyncService(); 