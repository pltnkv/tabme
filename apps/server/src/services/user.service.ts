import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { User, UserSettings, Subscription } from '@prisma/client';

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
}

export interface UserWithRelations extends User {
  settings?: UserSettings | null;
  subscription?: Subscription | null;
  _count?: {
    spaces: number;
  };
}

class UserService {
  async createUser(userData: CreateUserData): Promise<User> {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name
      }
    });

    // Create default user settings
    await prisma.userSettings.create({
      data: {
        userId: user.id
      }
    });

    // Create default subscription (FREE)
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'FREE',
        status: 'ACTIVE'
      }
    });

    return user;
  }

  async authenticateUser(loginData: LoginData): Promise<{ user: User; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email: loginData.email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    return { user, token };
  }

  async getUserById(userId: string): Promise<UserWithRelations | null> {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        subscription: true,
        _count: {
          select: { spaces: true }
        }
      }
    });
  }

  async updateUser(userId: string, updateData: UpdateUserData): Promise<User> {
    return await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await prisma.user.delete({
      where: { id: userId }
    });
  }

  async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    return await prisma.userSettings.upsert({
      where: { userId },
      update: settings,
      create: {
        userId,
        ...settings
      }
    });
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    return await prisma.userSettings.findUnique({
      where: { userId }
    });
  }

  async logout(token: string): Promise<void> {
    await prisma.session.delete({
      where: { token }
    });
  }

  async validateSession(token: string): Promise<User | null> {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { token } });
      }
      return null;
    }

    return session.user;
  }
}

export default new UserService(); 