import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all users in the system
 */
const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            spaces: true,
            sessions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Debug: Retrieved ${users.length} users`);
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users'
    });
  }
};

/**
 * Get all spaces in the system
 */
const getAllSpaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const spaces = await prisma.space.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        _count: {
          select: {
            folders: true,
            stickyNotes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Debug: Retrieved ${spaces.length} spaces`);
    
    res.json({
      success: true,
      count: spaces.length,
      data: spaces
    });
  } catch (error) {
    console.error('Error getting all spaces:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve spaces'
    });
  }
};

/**
 * Get all folders in the system
 */
const getAllFolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const folders = await prisma.folder.findMany({
      include: {
        space: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        },
        sourceFolder: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            items: true,
            syncedCopies: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Debug: Retrieved ${folders.length} folders`);
    
    res.json({
      success: true,
      count: folders.length,
      data: folders
    });
  } catch (error) {
    console.error('Error getting all folders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve folders'
    });
  }
};

/**
 * Get database statistics
 */
const getDatabaseStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      userCount,
      spaceCount,
      folderCount,
      itemCount,
      stickyNoteCount,
      sessionCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.space.count(),
      prisma.folder.count(),
      prisma.item.count(),
      prisma.stickyNote.count(),
      prisma.session.count()
    ]);

    const stats = {
      users: userCount,
      spaces: spaceCount,
      folders: folderCount,
      items: itemCount,
      stickyNotes: stickyNoteCount,
      activeSessions: sessionCount
    };

    console.log('Debug: Retrieved database statistics');
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database statistics'
    });
  }
};

export default {
  getAllUsers,
  getAllSpaces,
  getAllFolders,
  getDatabaseStats
}; 