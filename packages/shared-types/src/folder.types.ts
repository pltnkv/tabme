import type { Folder, Item, FolderSync } from '@prisma/client';

// Re-export Prisma types for convenience
export type { Folder, FolderSync } from '@prisma/client';
export type BookmarkItem = Item;

export interface CreateFolderData {
  title: string;
  color?: string;
  position: string;
  spaceId: string;
}

export interface UpdateFolderData {
  title?: string;
  color?: string;
  position?: string;
  spaceId?: string; // Allow moving folder to different space
}

export interface CreateSyncData {
  sourceFolderId: string;
  targetFolderId: string;
  syncDirection?: 'BIDIRECTIONAL' | 'ONE_WAY';
  conflictStrategy?: 'LATEST_WINS' | 'MANUAL_RESOLVE' | 'SOURCE_WINS';
}

export interface FolderWithItems extends Folder {
  items: BookmarkItem[];
  _count?: {
    items: number;
  };
  syncedCopies?: Folder[];
  sourceFolder?: Folder | null;
} 