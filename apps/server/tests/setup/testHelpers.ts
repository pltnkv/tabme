import request from 'supertest';
import { Express } from 'express';
import { User, Space, Folder, Item } from '@prisma/client';
import { testDb } from './database';
import bcrypt from 'bcryptjs';

// Types for test data
export interface TestUser {
  id: string;
  email: string;
  password: string;
  name?: string;
}

export interface AuthenticatedUser extends TestUser {
  token: string;
}

// Authentication helpers
export const createTestUser = async (userData?: Partial<User>): Promise<TestUser> => {
  const defaultUser = {
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    password: 'password123',
    name: 'Test User',
  };

  const userToCreate = { ...defaultUser, ...userData };
  const hashedPassword = await bcrypt.hash(userToCreate.password, 12);

  const user = await testDb.user.create({
    data: {
      email: userToCreate.email,
      password: hashedPassword,
      name: userToCreate.name,
    },
  });

  return {
    id: user.id,
    email: user.email,
    password: userToCreate.password, // Return original password for testing
    name: user.name || undefined,
  };
};

export const loginUser = async (app: Express, email: string, password: string): Promise<string> => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return response.body.token;
};

export const registerUser = async (app: Express, userData?: Partial<User>): Promise<AuthenticatedUser> => {
  const defaultUser = {
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    password: 'password123',
    name: 'Test User',
  };

  const userToRegister = { ...defaultUser, ...userData };

  const response = await request(app)
    .post('/api/auth/register')
    .send(userToRegister)
    .expect(201);

  const token = await loginUser(app, userToRegister.email, userToRegister.password);

  return {
    id: response.body.user.id,
    email: response.body.user.email,
    password: userToRegister.password,
    name: response.body.user.name,
    token,
  };
};

export const getAuthHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
});

// API request helpers
export const makeAuthenticatedRequest = (token: string, app: Express) => {
  return {
    get: (url: string) => request(app).get(url).set(getAuthHeaders(token)),
    post: (url: string) => request(app).post(url).set(getAuthHeaders(token)),
    put: (url: string) => request(app).put(url).set(getAuthHeaders(token)),
    patch: (url: string) => request(app).patch(url).set(getAuthHeaders(token)),
    delete: (url: string) => request(app).delete(url).set(getAuthHeaders(token)),
  };
};

// Data creation helpers
export const createDefaultSpace = async (userId: string, title?: string): Promise<Space> => {
  return testDb.space.create({
    data: {
      userId,
      title: title || `Test Space ${Date.now()}`,
    },
  });
};

export const createDefaultFolder = async (spaceId: string, title?: string): Promise<Folder> => {
  return testDb.folder.create({
    data: {
      spaceId,
      title: title || `Test Folder ${Date.now()}`,
      position: Date.now().toString(),
    },
  });
};

export const createDefaultItem = async (folderId: string, itemData?: Partial<Item>): Promise<Item> => {
  const defaultItem = {
    title: `Test Bookmark ${Date.now()}`,
    url: 'https://example.com',
    position: Date.now().toString(),
  };

  const itemToCreate = { ...defaultItem, ...itemData };

  return testDb.item.create({
    data: {
      folderId,
      title: itemToCreate.title,
      url: itemToCreate.url,
      position: itemToCreate.position,
      favicon: itemToCreate.favicon,
    },
  });
};

// Assertion helpers
export const expectValidationError = (response: any, field: string): void => {
  expect(response.status).toBe(400);
  expect(response.body.errors).toBeDefined();
  expect(response.body.errors.some((error: any) => 
    error.path === field || error.param === field
  )).toBe(true);
};

export const expectNotFound = (response: any): void => {
  expect(response.status).toBe(404);
  expect(response.body.error).toBeDefined();
};

export const expectUnauthorized = (response: any): void => {
  expect(response.status).toBe(401);
  expect(response.body.error).toBeDefined();
};

export const expectForbidden = (response: any): void => {
  expect(response.status).toBe(403);
  expect(response.body.error).toBeDefined();
};

export const expectSuccessfulCreation = (response: any): void => {
  expect(response.status).toBe(201);
  expect(response.body).toBeDefined();
};

export const expectSuccessfulUpdate = (response: any): void => {
  expect(response.status).toBe(200);
  expect(response.body).toBeDefined();
};

export const expectSuccessfulDeletion = (response: any): void => {
  expect([200, 204]).toContain(response.status);
};

// Utility functions
export const generateUniqueEmail = (): string => {
  return `test-${Date.now()}-${Math.random()}@example.com`;
};

export const generateRandomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(0, length);
};

export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
}; 