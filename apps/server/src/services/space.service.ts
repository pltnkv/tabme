import prisma from '../config/db';
import { Space, Folder, StickyNote, UserSpacePosition } from '@prisma/client';

export interface CreateSpaceData {
  title: string;
  position: string;
}

export interface UpdateSpaceData {
  title?: string;
}

export interface SpaceWithDetails extends Space {
  folders: Folder[];
  stickyNotes: StickyNote[];
  _count?: {
    folders: number;
    stickyNotes: number;
  };
  userPosition?: UserSpacePosition | null;
}

export interface UpdatePositionsData {
  spaceId: string;
  position: string;
}

class SpaceService {
  async createSpace(userId: string, spaceData: CreateSpaceData): Promise<Space> {
    const space = await prisma.space.create({
      data: {
        userId,
        title: spaceData.title
      }
    });

    // Create user position for the space owner
    await prisma.userSpacePosition.create({
      data: {
        userId,
        spaceId: space.id,
        position: spaceData.position
      }
    });

    return space;
  }

  async getUserSpaces(userId: string): Promise<SpaceWithDetails[]> {
    // Get all spaces the user owns or has access to through positions
    const userPositions = await prisma.userSpacePosition.findMany({
      where: { userId },
      include: {
        space: {
          include: {
            folders: true,
            stickyNotes: true,
            _count: {
              select: {
                folders: true,
                stickyNotes: true
              }
            }
          }
        }
      },
      orderBy: { position: 'asc' }
    });

    return userPositions.map(pos => ({
      ...pos.space,
      userPosition: pos
    }));
  }

  async getSpaceById(spaceId: string, userId: string): Promise<SpaceWithDetails | null> {
    // Check if user has access to this space
    const hasAccess = await this.checkUserSpaceAccess(userId, spaceId);
    if (!hasAccess) {
      return null;
    }

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        folders: {
          orderBy: { position: 'asc' },
          include: {
            items: {
              orderBy: { position: 'asc' }
            }
          }
        },
        stickyNotes: true,
        _count: {
          select: {
            folders: true,
            stickyNotes: true
          }
        }
      }
    });

    if (!space) return null;

    // Get user's position for this space
    const userPosition = await prisma.userSpacePosition.findUnique({
      where: {
        userId_spaceId: {
          userId,
          spaceId
        }
      }
    });

    return {
      ...space,
      userPosition
    };
  }

  async updateSpace(spaceId: string, userId: string, updateData: UpdateSpaceData): Promise<Space | null> {
    // Check if user is the owner
    const space = await prisma.space.findFirst({
      where: {
        id: spaceId,
        userId
      }
    });

    if (!space) {
      throw new Error('Space not found or access denied');
    }

    return await prisma.space.update({
      where: { id: spaceId },
      data: updateData
    });
  }

  async deleteSpace(spaceId: string, userId: string): Promise<void> {
    // Check if user is the owner
    const space = await prisma.space.findFirst({
      where: {
        id: spaceId,
        userId
      }
    });

    if (!space) {
      throw new Error('Space not found or access denied');
    }

    await prisma.space.delete({
      where: { id: spaceId }
    });
  }

  async updateUserSpacePositions(userId: string, positions: UpdatePositionsData[]): Promise<void> {
    // Update all positions in a transaction
    await prisma.$transaction(
      positions.map(({ spaceId, position }) =>
        prisma.userSpacePosition.upsert({
          where: {
            userId_spaceId: {
              userId,
              spaceId
            }
          },
          update: { position },
          create: {
            userId,
            spaceId,
            position
          }
        })
      )
    );
  }

  async getUserSpacePosition(userId: string, spaceId: string): Promise<UserSpacePosition | null> {
    return await prisma.userSpacePosition.findUnique({
      where: {
        userId_spaceId: {
          userId,
          spaceId
        }
      }
    });
  }

  async checkUserSpaceAccess(userId: string, spaceId: string): Promise<boolean> {
    // Check if user is the owner
    const ownedSpace = await prisma.space.findFirst({
      where: {
        id: spaceId,
        userId
      }
    });

    if (ownedSpace) return true;

    // Check if user has a position for this space (indicating access)
    const userPosition = await prisma.userSpacePosition.findFirst({
      where: {
        userId,
        spaceId
      }
    });

    return !!userPosition;
  }

  async addUserToSpace(spaceId: string, userId: string, position: string): Promise<UserSpacePosition> {
    // Check if space exists
    const space = await prisma.space.findUnique({
      where: { id: spaceId }
    });

    if (!space) {
      throw new Error('Space not found');
    }

    return await prisma.userSpacePosition.create({
      data: {
        userId,
        spaceId,
        position
      }
    });
  }

  async removeUserFromSpace(spaceId: string, userId: string, requestingUserId: string): Promise<void> {
    // Check if requesting user is the owner
    const space = await prisma.space.findFirst({
      where: {
        id: spaceId,
        userId: requestingUserId
      }
    });

    if (!space) {
      throw new Error('Only space owner can remove users');
    }

    await prisma.userSpacePosition.delete({
      where: {
        userId_spaceId: {
          userId,
          spaceId
        }
      }
    });
  }

  async getSpaceUsers(spaceId: string, requestingUserId: string): Promise<any[]> {
    // Check if requesting user has access
    const hasAccess = await this.checkUserSpaceAccess(requestingUserId, spaceId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const positions = await prisma.userSpacePosition.findMany({
      where: { spaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    return positions.map(pos => ({
      ...pos.user,
      position: pos.position
    }));
  }
}

export default new SpaceService(); 