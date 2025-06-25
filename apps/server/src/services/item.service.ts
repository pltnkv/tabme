import prisma from '../config/db';
import { Item } from '@prisma/client';
import spaceService from './space.service';
import folderService from './folder.service';

export interface CreateItemData {
  title: string;
  url: string;
  favicon?: string;
  position: string;
  folderId: string;
}

export interface UpdateItemData {
  title?: string;
  url?: string;
  favicon?: string;
  position?: string;
}

export interface BulkUpdateItemData {
  id: string;
  position: string;
}

class ItemService {
  async createItem(userId: string, itemData: CreateItemData): Promise<Item> {
    // Get folder and check access
    const folder = await prisma.folder.findUnique({
      where: { id: itemData.folderId }
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check if user has access to the space
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, folder.spaceId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const item = await prisma.item.create({
      data: {
        folderId: itemData.folderId,
        title: itemData.title,
        url: itemData.url,
        favicon: itemData.favicon,
        position: itemData.position
      }
    });

    // If folder is synced, sync this item to connected folders
    await this.syncItemToConnectedFolders(itemData.folderId, item);

    return item;
  }

  async getItemById(itemId: string, userId: string): Promise<Item | null> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        folder: true
      }
    });

    if (!item) return null;

    // Check if user has access to the space
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, item.folder.spaceId);
    if (!hasAccess) {
      return null;
    }

    return item;
  }

  async updateItem(itemId: string, userId: string, updateData: UpdateItemData): Promise<Item | null> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        folder: true
      }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check if user has access to the space
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, item.folder.spaceId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        ...updateData,
        lastUsedAt: new Date()
      }
    });

    // If folder is synced, sync this item update to connected folders
    await this.syncItemUpdateToConnectedFolders(item.folderId, updatedItem);

    return updatedItem;
  }

  async deleteItem(itemId: string, userId: string): Promise<void> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        folder: true
      }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check if user has access to the space
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, item.folder.spaceId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    await prisma.item.delete({
      where: { id: itemId }
    });

    // If folder is synced, remove this item from connected folders
    await this.syncItemDeletionToConnectedFolders(item.folderId, item.url);
  }

  async getFolderItems(folderId: string, userId: string): Promise<Item[]> {
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

    return await prisma.item.findMany({
      where: { folderId },
      orderBy: { position: 'asc' }
    });
  }

  async moveItem(itemId: string, userId: string, targetFolderId: string, position: string): Promise<Item> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        folder: true
      }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    const targetFolder = await prisma.folder.findUnique({
      where: { id: targetFolderId }
    });

    if (!targetFolder) {
      throw new Error('Target folder not found');
    }

    // Check access to both source and target spaces
    const hasSourceAccess = await spaceService.checkUserSpaceAccess(userId, item.folder.spaceId);
    const hasTargetAccess = await spaceService.checkUserSpaceAccess(userId, targetFolder.spaceId);

    if (!hasSourceAccess || !hasTargetAccess) {
      throw new Error('Access denied');
    }

    return await prisma.item.update({
      where: { id: itemId },
      data: {
        folderId: targetFolderId,
        position
      }
    });
  }

  async bulkUpdateItemPositions(userId: string, updates: BulkUpdateItemData[]): Promise<void> {
    // Validate all items belong to accessible folders
    const itemIds = updates.map(u => u.id);
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds }
      },
      include: {
        folder: true
      }
    });

    // Check access to all spaces
    for (const item of items) {
      const hasAccess = await spaceService.checkUserSpaceAccess(userId, item.folder.spaceId);
      if (!hasAccess) {
        throw new Error('Access denied to one or more items');
      }
    }

    // Update positions in a transaction
    await prisma.$transaction(
      updates.map(update =>
        prisma.item.update({
          where: { id: update.id },
          data: { position: update.position }
        })
      )
    );
  }

  async searchItems(userId: string, query: string): Promise<Item[]> {
    // Get all spaces the user has access to
    const userSpaces = await spaceService.getUserSpaces(userId);
    const spaceIds = userSpaces.map(space => space.id);

    return await prisma.item.findMany({
      where: {
        folder: {
          spaceId: { in: spaceIds }
        },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { url: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        folder: {
          include: {
            space: true
          }
        }
      },
      orderBy: [
        { lastUsedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async getRecentlyUsedItems(userId: string, limit: number = 20): Promise<Item[]> {
    // Get all spaces the user has access to
    const userSpaces = await spaceService.getUserSpaces(userId);
    const spaceIds = userSpaces.map(space => space.id);

    return await prisma.item.findMany({
      where: {
        folder: {
          spaceId: { in: spaceIds }
        },
        lastUsedAt: { not: null }
      },
      include: {
        folder: {
          include: {
            space: true
          }
        }
      },
      orderBy: { lastUsedAt: 'desc' },
      take: limit
    });
  }

  async markItemAsUsed(itemId: string, userId: string): Promise<void> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        folder: true
      }
    });

    if (!item) return;

    // Check if user has access
    const hasAccess = await spaceService.checkUserSpaceAccess(userId, item.folder.spaceId);
    if (!hasAccess) return;

    await prisma.item.update({
      where: { id: itemId },
      data: { lastUsedAt: new Date() }
    });
  }

  // Sync Helper Methods
  private async syncItemToConnectedFolders(folderId: string, item: Item): Promise<void> {
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
      const targetFolderId = isSource ? sync.targetFolderId : sync.sourceFolderId;

      // Check sync direction
      if (sync.syncDirection === 'BIDIRECTIONAL' || 
          (sync.syncDirection === 'ONE_WAY' && isSource)) {
        
        // Check if item already exists in target folder (avoid duplicates)
        const existingItem = await prisma.item.findFirst({
          where: {
            folderId: targetFolderId,
            url: item.url
          }
        });

        if (!existingItem) {
          await prisma.item.create({
            data: {
              folderId: targetFolderId,
              title: item.title,
              url: item.url,
              favicon: item.favicon,
              position: item.position
            }
          });
        }
      }
    }
  }

  private async syncItemUpdateToConnectedFolders(folderId: string, updatedItem: Item): Promise<void> {
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
      const targetFolderId = isSource ? sync.targetFolderId : sync.sourceFolderId;

      // Check sync direction
      if (sync.syncDirection === 'BIDIRECTIONAL' || 
          (sync.syncDirection === 'ONE_WAY' && isSource)) {
        
        // Find and update corresponding item in target folder
        const targetItem = await prisma.item.findFirst({
          where: {
            folderId: targetFolderId,
            url: updatedItem.url
          }
        });

        if (targetItem) {
          await prisma.item.update({
            where: { id: targetItem.id },
            data: {
              title: updatedItem.title,
              favicon: updatedItem.favicon,
              position: updatedItem.position
            }
          });
        }
      }
    }
  }

  private async syncItemDeletionToConnectedFolders(folderId: string, itemUrl: string): Promise<void> {
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
      const targetFolderId = isSource ? sync.targetFolderId : sync.sourceFolderId;

      // Check sync direction
      if (sync.syncDirection === 'BIDIRECTIONAL' || 
          (sync.syncDirection === 'ONE_WAY' && isSource)) {
        
        // Find and delete corresponding item in target folder
        const targetItem = await prisma.item.findFirst({
          where: {
            folderId: targetFolderId,
            url: itemUrl
          }
        });

        if (targetItem) {
          await prisma.item.delete({
            where: { id: targetItem.id }
          });
        }
      }
    }
  }
}

export default new ItemService(); 