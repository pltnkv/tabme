import prisma from '../config/db';
import { Folder, FolderSync } from '@prisma/client';
import spaceService from './space.service';
import type { 
  CreateFolderData, 
  UpdateFolderData, 
  FolderWithItems, 
  CreateSyncData 
} from '@tabme/shared-types';

class FolderService {
  async createFolder(userId: string, folderData: CreateFolderData): Promise<Folder> {
    // Check if user has access to the space
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, folderData.spaceId);
    if (!hasAccess) {
      throw new Error('Access denied to space');
    }

    return await prisma.folder.create({
      data: {
        spaceId: folderData.spaceId,
        title: folderData.title,
        color: folderData.color || '#6366f1',
        position: folderData.position
      }
    });
  }

  async getFolderById(folderId: string, userId: string): Promise<FolderWithItems | null> {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        items: {
          orderBy: { position: 'asc' }
        },
        syncedCopies: true,
        sourceFolder: true,
        _count: {
          select: { items: true }
        }
      }
    });

    if (!folder) return null;

    // Check if user has access to the space
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, folder.spaceId);
    if (!hasAccess) {
      return null;
    }

    return folder;
  }

  async updateFolder(folderId: string, userId: string, updateData: UpdateFolderData): Promise<Folder | null> {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check if user has access to the current space
    const hasCurrentAccess = await spaceService.checkUserSpaceAccess(userId, folder.spaceId);
    if (!hasCurrentAccess) {
      throw new Error('Access denied');
    }

    // If moving to a different space, check access to target space
    if (updateData.spaceId && updateData.spaceId !== folder.spaceId) {
      const hasTargetAccess = await spaceService.checkUserSpaceAccess(userId, updateData.spaceId);
      if (!hasTargetAccess) {
        throw new Error('Access denied to target space');
      }

      // If this is a synced copy, prevent moving it to a different space
      if (folder.isSyncedCopy) {
        throw new Error('Cannot move synced folder copies to different spaces');
      }

      // If this folder has synced copies, we need to handle them appropriately
      const syncedCopies = await prisma.folder.findMany({
        where: { sourceFolderId: folderId }
      });

      if (syncedCopies.length > 0) {
        throw new Error('Cannot move folder with synced copies to different spaces. Remove synced copies first.');
      }
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: updateData
    });

    // If this folder has synced copies, update them too (but not spaceId)
    if (folder.isSyncedCopy === false) {
      const syncData = { ...updateData };
      delete syncData.spaceId; // Don't sync spaceId changes to copies
      await this.syncFolderChanges(folderId, syncData);
    }

    return updatedFolder;
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check if user has access to the space
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, folder.spaceId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    await prisma.folder.delete({
      where: { id: folderId }
    });
  }

  async getSpaceFolders(spaceId: string, userId: string): Promise<FolderWithItems[]> {
    // Check if user has access to the space
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, spaceId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await prisma.folder.findMany({
      where: { spaceId },
      include: {
        items: {
          orderBy: { position: 'asc' }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { position: 'asc' }
    });
  }

  // Synced Folder Functionality
  async createSyncedCopy(userId: string, sourceFolderId: string, targetSpaceId: string, position: string): Promise<Folder> {
    const sourceFolder = await prisma.folder.findUnique({
      where: { id: sourceFolderId },
      include: {
        items: true
      }
    });

    if (!sourceFolder) {
      throw new Error('Source folder not found');
    }

    // Check access to both spaces
    const hasSourceAccess = await spaceService.checkUserSpaceAccess(userId, sourceFolder.spaceId);
    const hasTargetAccess = await spaceService.checkUserSpaceAccess(userId, targetSpaceId);

    if (!hasSourceAccess || !hasTargetAccess) {
      throw new Error('Access denied to one or both spaces');
    }

    // Create synced copy folder
    const syncedFolder = await prisma.folder.create({
      data: {
        spaceId: targetSpaceId,
        title: sourceFolder.title,
        color: sourceFolder.color,
        position,
        sourceFolderId,
        isSyncedCopy: true,
        lastSyncAt: new Date()
      }
    });

    // Copy all items from source folder
    if (sourceFolder.items.length > 0) {
      await prisma.item.createMany({
        data: sourceFolder.items.map(item => ({
          folderId: syncedFolder.id,
          title: item.title,
          url: item.url,
          favicon: item.favicon,
          position: item.position
        }))
      });
    }

    // Create folder sync relationship
    await prisma.folderSync.create({
      data: {
        sourceFolderId,
        targetFolderId: syncedFolder.id,
        syncDirection: 'BIDIRECTIONAL',
        lastSyncAt: new Date(),
        syncStatus: 'ACTIVE'
      }
    });

    return syncedFolder;
  }

  async createFolderSync(userId: string, syncData: CreateSyncData): Promise<FolderSync> {
    const sourceFolder = await prisma.folder.findUnique({
      where: { id: syncData.sourceFolderId }
    });
    const targetFolder = await prisma.folder.findUnique({
      where: { id: syncData.targetFolderId }
    });

    if (!sourceFolder || !targetFolder) {
      throw new Error('Source or target folder not found');
    }

    // Check access to both spaces
    const hasSourceAccess = await spaceService.checkUserSpaceAccess(userId, sourceFolder.spaceId);
    const hasTargetAccess = await spaceService.checkUserSpaceAccess(userId, targetFolder.spaceId);

    if (!hasSourceAccess || !hasTargetAccess) {
      throw new Error('Access denied to one or both spaces');
    }

    return await prisma.folderSync.create({
      data: {
        sourceFolderId: syncData.sourceFolderId,
        targetFolderId: syncData.targetFolderId,
        syncDirection: syncData.syncDirection || 'BIDIRECTIONAL',
        conflictStrategy: syncData.conflictStrategy || 'LATEST_WINS',
        syncStatus: 'ACTIVE'
      }
    });
  }

  async getFolderSyncs(folderId: string, userId: string): Promise<FolderSync[]> {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check access
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, folder.spaceId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await prisma.folderSync.findMany({
      where: {
        OR: [
          { sourceFolderId: folderId },
          { targetFolderId: folderId }
        ]
      },
      include: {
        sourceFolder: true,
        targetFolder: true
      }
    });
  }

  async syncFolderChanges(folderId: string, changes: any): Promise<void> {
    // Get all sync relationships for this folder
    const syncs = await prisma.folderSync.findMany({
      where: {
        OR: [
          { sourceFolderId: folderId },
          { targetFolderId: folderId }
        ],
        syncStatus: 'ACTIVE'
      }
    });

    for (const sync of syncs) {
      const isSource = sync.sourceFolderId === folderId;
      const targetId = isSource ? sync.targetFolderId : sync.sourceFolderId;

      // Apply changes based on sync direction
      if (sync.syncDirection === 'BIDIRECTIONAL' || 
          (sync.syncDirection === 'ONE_WAY' && isSource)) {
        
        await prisma.folder.update({
          where: { id: targetId },
          data: {
            ...changes,
            lastSyncAt: new Date()
          }
        });

        // Update sync timestamp
        await prisma.folderSync.update({
          where: { id: sync.id },
          data: { lastSyncAt: new Date() }
        });
      }
    }
  }

  async removeFolderSync(syncId: string, userId: string): Promise<void> {
    const sync = await prisma.folderSync.findUnique({
      where: { id: syncId },
      include: {
        sourceFolder: true,
        targetFolder: true
      }
    });

    if (!sync) {
      throw new Error('Sync relationship not found');
    }

    // Check access to both folders
    const hasSourceAccess = await spaceService.checkUserSpaceAccess(userId, sync.sourceFolder.spaceId);
    const hasTargetAccess = await spaceService.checkUserSpaceAccess(userId, sync.targetFolder.spaceId);

    if (!hasSourceAccess || !hasTargetAccess) {
      throw new Error('Access denied');
    }

    await prisma.folderSync.delete({
      where: { id: syncId }
    });
  }

  async pauseFolderSync(syncId: string, userId: string): Promise<FolderSync> {
    const sync = await prisma.folderSync.findUnique({
      where: { id: syncId },
      include: {
        sourceFolder: true
      }
    });

    if (!sync) {
      throw new Error('Sync relationship not found');
    }

    // Check access
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, sync.sourceFolder.spaceId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await prisma.folderSync.update({
      where: { id: syncId },
      data: { syncStatus: 'PAUSED' }
    });
  }

  async resumeFolderSync(syncId: string, userId: string): Promise<FolderSync> {
    const sync = await prisma.folderSync.findUnique({
      where: { id: syncId },
      include: {
        sourceFolder: true
      }
    });

    if (!sync) {
      throw new Error('Sync relationship not found');
    }

    // Check access
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, sync.sourceFolder.spaceId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await prisma.folderSync.update({
      where: { id: syncId },
      data: { syncStatus: 'ACTIVE' }
    });
  }
}

export default new FolderService(); 