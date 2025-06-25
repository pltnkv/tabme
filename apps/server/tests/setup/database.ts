import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config();

// Set up test environment variables if not already set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Create a separate Prisma client for testing
export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

// Global setup for all tests
beforeAll(async () => {
  // Connect to the test database
  await testDb.$connect();
});

// Global cleanup after all tests
afterAll(async () => {
  // Disconnect from the test database
  await testDb.$disconnect();
});

// Cleanup function to reset database state between tests
export const cleanupDatabase = async (): Promise<void> => {
  // Delete in reverse order of dependencies to avoid foreign key constraints
  await testDb.syncLog.deleteMany({});
  await testDb.session.deleteMany({});
  await testDb.item.deleteMany({});
  await testDb.stickyNote.deleteMany({});
  await testDb.folder.deleteMany({});
  await testDb.userSpacePosition.deleteMany({});
  await testDb.space.deleteMany({});
  await testDb.userSettings.deleteMany({});
  await testDb.subscription.deleteMany({});
  await testDb.user.deleteMany({});
};

// Helper to create a clean database state before each test
export const setupCleanDatabase = async (): Promise<void> => {
  await cleanupDatabase();
};

// Database transaction helper for test isolation
export const withTransaction = async <T>(
  callback: (db: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> => {
  return testDb.$transaction(callback);
}; 