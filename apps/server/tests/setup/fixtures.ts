import { User, Space, Folder, Item } from '@prisma/client';

// User fixtures
export const userFixtures = {
  validUser: {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  },
  
  adminUser: {
    email: 'admin@example.com',
    password: 'adminpass123',
    name: 'Admin User',
  },

  userWithoutName: {
    email: 'noname@example.com',
    password: 'password123',
  },

  invalidEmailUser: {
    email: 'invalid-email',
    password: 'password123',
    name: 'Invalid Email User',
  },

  shortPasswordUser: {
    email: 'short@example.com',
    password: '123',
    name: 'Short Password User',
  },
};

// Space fixtures
export const spaceFixtures = {
  defaultSpace: {
    title: 'My Bookmarks',
  },

  workSpace: {
    title: 'Work Space',
  },

  personalSpace: {
    title: 'Personal',
  },

  emptyTitleSpace: {
    title: '',
  },

  longTitleSpace: {
    title: 'This is a very long space title that might test the limits of our validation',
  },
};

// Folder fixtures
export const folderFixtures = {
  defaultFolder: {
    title: 'General',
    color: '#6366f1',
    position: '1000',
  },

  developmentFolder: {
    title: 'Development',
    color: '#10b981',
    position: '2000',
  },

  socialFolder: {
    title: 'Social Media',
    color: '#f59e0b',
    position: '3000',
  },

  emptyTitleFolder: {
    title: '',
    color: '#6366f1',
    position: '4000',
  },

  invalidColorFolder: {
    title: 'Invalid Color',
    color: 'not-a-color',
    position: '5000',
  },
};

// Item/Bookmark fixtures
export const itemFixtures = {
  googleBookmark: {
    title: 'Google',
    url: 'https://www.google.com',
    favicon: 'https://www.google.com/favicon.ico',
    position: '1000',
  },

  githubBookmark: {
    title: 'GitHub',
    url: 'https://github.com',
    favicon: 'https://github.com/favicon.ico',
    position: '2000',
  },

  stackOverflowBookmark: {
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    position: '3000',
  },

  invalidUrlBookmark: {
    title: 'Invalid URL',
    url: 'not-a-valid-url',
    position: '4000',
  },

  emptyTitleBookmark: {
    title: '',
    url: 'https://example.com',
    position: '5000',
  },

  longTitleBookmark: {
    title: 'This is a very long bookmark title that might test our validation limits for bookmark titles',
    url: 'https://example.com',
    position: '6000',
  },
};

// Factory functions for generating test data
export class UserFactory {
  static create(overrides?: Partial<typeof userFixtures.validUser>) {
    return {
      ...userFixtures.validUser,
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      ...overrides,
    };
  }

  static createMultiple(count: number, overrides?: Partial<typeof userFixtures.validUser>) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export class SpaceFactory {
  static create(overrides?: Partial<typeof spaceFixtures.defaultSpace>) {
    return {
      ...spaceFixtures.defaultSpace,
      title: `Test Space ${Date.now()}`,
      ...overrides,
    };
  }

  static createMultiple(count: number, overrides?: Partial<typeof spaceFixtures.defaultSpace>) {
    return Array.from({ length: count }, (_, index) => ({
      ...this.create(overrides),
      title: `Test Space ${Date.now()}-${index}`,
    }));
  }
}

export class FolderFactory {
  static create(overrides?: Partial<typeof folderFixtures.defaultFolder>) {
    return {
      ...folderFixtures.defaultFolder,
      title: `Test Folder ${Date.now()}`,
      position: Date.now().toString(),
      ...overrides,
    };
  }

  static createMultiple(count: number, overrides?: Partial<typeof folderFixtures.defaultFolder>) {
    return Array.from({ length: count }, (_, index) => ({
      ...this.create(overrides),
      title: `Test Folder ${Date.now()}-${index}`,
      position: (Date.now() + index).toString(),
    }));
  }
}

export class ItemFactory {
  static create(overrides?: Partial<typeof itemFixtures.googleBookmark>) {
    return {
      ...itemFixtures.googleBookmark,
      title: `Test Bookmark ${Date.now()}`,
      url: `https://example-${Date.now()}.com`,
      position: Date.now().toString(),
      ...overrides,
    };
  }

  static createMultiple(count: number, overrides?: Partial<typeof itemFixtures.googleBookmark>) {
    return Array.from({ length: count }, (_, index) => ({
      ...this.create(overrides),
      title: `Test Bookmark ${Date.now()}-${index}`,
      url: `https://example-${Date.now()}-${index}.com`,
      position: (Date.now() + index).toString(),
    }));
  }
}

// Validation test data
export const validationTestData = {
  // Invalid email formats
  invalidEmails: [
    'invalid-email',
    'test@',
    '@example.com',
    'test.example.com',
    'test@.com',
    '',
  ],

  // Weak passwords
  weakPasswords: [
    '123',
    'pass',
    '12345',
    '',
  ],

  // Invalid URLs
  invalidUrls: [
    'not-a-url',
    'http://',
    'https://',
    'ftp://example.com',
    'javascript:alert(1)',
    '',
  ],

  // Invalid UUIDs
  invalidUuids: [
    'not-a-uuid',
    '123',
    '12345678-1234-1234-1234-12345678901',
    '',
    'null',
    'undefined',
  ],
};

// Bulk operations test data
export const bulkOperationsData = {
  positionUpdates: [
    { id: 'item-1', position: '1000' },
    { id: 'item-2', position: '2000' },
    { id: 'item-3', position: '3000' },
  ],

  invalidPositionUpdates: [
    { id: 'invalid-uuid', position: '1000' },
    { position: '2000' }, // missing id
    { id: 'item-1' }, // missing position
  ],
}; 