import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../setup/app';
import { cleanupDatabase, testDb } from '../setup/database';
import { 
  registerUser, 
  makeAuthenticatedRequest,
  expectUnauthorized,
  expectNotFound,
  expectSuccessfulUpdate,
  expectSuccessfulDeletion,
  generateUniqueEmail,
  AuthenticatedUser,
  createDefaultSpace,
  createDefaultFolder,
  createDefaultItem
} from '../setup/testHelpers';

describe('User Management API', () => {
  let app: Express;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('User Registration and Profile Management', () => {
    it('should register a new user and retrieve profile', async () => {
      const userData = {
        email: generateUniqueEmail(),
        password: 'password123',
        name: 'Test User',
      };

      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.user.email).toBe(userData.email);
      expect(registerResponse.body.user.name).toBe(userData.name);
      expect(registerResponse.body.user.password).toBeUndefined();

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      const token = loginResponse.body.token;

      // Get user profile
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set({ Authorization: `Bearer ${token}` })
        .expect(200);

      expect(profileResponse.body.email).toBe(userData.email);
      expect(profileResponse.body.name).toBe(userData.name);
      expect(profileResponse.body.password).toBeUndefined();
    });

    it('should rename user successfully', async () => {
      const testUser = await registerUser(app);
      const authRequest = makeAuthenticatedRequest(testUser.token, app);

      const updateData = {
        name: 'Updated Test User Name',
      };

      const response = await authRequest
        .put('/api/users/profile')
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.password).toBeUndefined();
    });

    it('should add folder to user space', async () => {
      const testUser = await registerUser(app);
      const authRequest = makeAuthenticatedRequest(testUser.token, app);

      // Create a space first
      const spaceResponse = await authRequest
        .post('/api/spaces')
        .send({
          title: 'Test Space',
          position: '1000',
        })
        .expect(201);

      const spaceId = spaceResponse.body.id;

      // Create folder in the space
      const folderResponse = await authRequest
        .post('/api/folders')
        .send({
          title: 'Test Folder',
          spaceId: spaceId,
          position: '1000',
        })
        .expect(201);

      expect(folderResponse.body.title).toBe('Test Folder');
      expect(folderResponse.body.spaceId).toBe(spaceId);
      expect(folderResponse.body.position).toBe('1000');
    });

    it('should add bookmark to folder', async () => {
      const testUser = await registerUser(app);
      const authRequest = makeAuthenticatedRequest(testUser.token, app);

      // Create space and folder
      const space = await createDefaultSpace(testUser.id);
      const folder = await createDefaultFolder(space.id);

      // Add bookmark to folder
      const bookmarkResponse = await authRequest
        .post('/api/items')
        .send({
          title: 'Test Bookmark',
          url: 'https://example.com',
          folderId: folder.id,
          position: '1000',
        })
        .expect(201);

      expect(bookmarkResponse.body.title).toBe('Test Bookmark');
      expect(bookmarkResponse.body.url).toBe('https://example.com');
      expect(bookmarkResponse.body.folderId).toBe(folder.id);
    });

    it('should delete user and cleanup all associated data', async () => {
      const testUser = await registerUser(app);
      const authRequest = makeAuthenticatedRequest(testUser.token, app);

      // Create some data for the user
      const space = await createDefaultSpace(testUser.id);
      const folder = await createDefaultFolder(space.id);
      const item = await createDefaultItem(folder.id);

      // Verify data exists
      const spaceExists = await testDb.space.findUnique({ where: { id: space.id } });
      const folderExists = await testDb.folder.findUnique({ where: { id: folder.id } });
      const itemExists = await testDb.item.findUnique({ where: { id: item.id } });

      expect(spaceExists).toBeTruthy();
      expect(folderExists).toBeTruthy();
      expect(itemExists).toBeTruthy();

      // Delete user
      const deleteResponse = await authRequest
        .delete('/api/users/account')
        .expect(200);

      expect(deleteResponse.body.message).toBeDefined();

      // Verify user is deleted
      const userExists = await testDb.user.findUnique({ where: { id: testUser.id } });
      expect(userExists).toBeNull();

      // Verify associated data is cleaned up (cascade delete)
      const spaceDeleted = await testDb.space.findUnique({ where: { id: space.id } });
      const folderDeleted = await testDb.folder.findUnique({ where: { id: folder.id } });
      const itemDeleted = await testDb.item.findUnique({ where: { id: item.id } });

      expect(spaceDeleted).toBeNull();
      expect(folderDeleted).toBeNull();
      expect(itemDeleted).toBeNull();
    });

    it('should not allow access to deleted user bookmarks', async () => {
      const testUser = await registerUser(app);
      const authRequest = makeAuthenticatedRequest(testUser.token, app);

      // Create some data for the user
      const space = await createDefaultSpace(testUser.id);
      const folder = await createDefaultFolder(space.id);
      const item = await createDefaultItem(folder.id);

      // Verify user can access their bookmarks
      await authRequest
        .get(`/api/items/${item.id}`)
        .expect(200);

      // Delete user
      await authRequest
        .delete('/api/users/account')
        .expect(200);

      // Try to access the bookmark with the same token (should fail)
      const response = await request(app)
        .get(`/api/items/${item.id}`)
        .set({ Authorization: `Bearer ${testUser.token}` })
        .expect(401);

      expectUnauthorized(response);
    });
  });

  describe('User Profile Validation', () => {
    let testUser: AuthenticatedUser;

    beforeEach(async () => {
      testUser = await registerUser(app);
    });

    it('should require authentication for profile operations', async () => {
      // Try to get profile without token
      const getResponse = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expectUnauthorized(getResponse);

      // Try to update profile without token
      const updateResponse = await request(app)
        .put('/api/users/profile')
        .send({ name: 'New Name' })
        .expect(401);

      expectUnauthorized(updateResponse);

      // Try to delete profile without token
      const deleteResponse = await request(app)
        .delete('/api/users/profile')
        .expect(401);

      expectUnauthorized(deleteResponse);
    });

    it('should validate profile update data', async () => {
      const authRequest = makeAuthenticatedRequest(testUser.token, app);

      // Test with invalid email format
      const invalidEmailResponse = await authRequest
        .put('/api/users/profile')
        .send({
          email: 'invalid-email-format',
        });

      expect(invalidEmailResponse.status).toBe(400);
      expect(invalidEmailResponse.body.errors).toBeDefined();

      // Test with empty name
      const emptyNameResponse = await authRequest
        .put('/api/users/profile')
        .send({
          name: '',
        });

      expect(emptyNameResponse.status).toBe(400);
      expect(emptyNameResponse.body.errors).toBeDefined();
    });

    it('should handle invalid user ID in profile requests', async () => {
      const authRequest = makeAuthenticatedRequest('invalid-token', app);

      const response = await authRequest
        .get('/api/users/profile')
        .expect(401);

      expectUnauthorized(response);
    });
  });

  describe('User Data Consistency', () => {
    it('should maintain data integrity after user operations', async () => {
      const testUser = await registerUser(app);
      const authRequest = makeAuthenticatedRequest(testUser.token, app);

      // Create complex data structure
      const space = await createDefaultSpace(testUser.id, 'My Space');
      const folder1 = await createDefaultFolder(space.id, 'Folder 1');
      const folder2 = await createDefaultFolder(space.id, 'Folder 2');
      const item1 = await createDefaultItem(folder1.id, { title: 'Bookmark 1' });
      const item2 = await createDefaultItem(folder2.id, { title: 'Bookmark 2' });

      // Update user name
      await authRequest
        .put('/api/users/profile')
        .send({ name: 'Updated Name' })
        .expect(200);

      // Verify all data still exists and is accessible
      const spaceResponse = await authRequest
        .get(`/api/spaces/${space.id}`)
        .expect(200);

      expect(spaceResponse.body.id).toBe(space.id);

      const folder1Response = await authRequest
        .get(`/api/folders/${folder1.id}`)
        .expect(200);

      expect(folder1Response.body.id).toBe(folder1.id);

      const item1Response = await authRequest
        .get(`/api/items/${item1.id}`)
        .expect(200);

      expect(item1Response.body.id).toBe(item1.id);
    });

    it('should handle concurrent user operations', async () => {
      const testUser = await registerUser(app);
      const authRequest = makeAuthenticatedRequest(testUser.token, app);

      // Create concurrent update requests
      const updateRequests = [
        authRequest.put('/api/users/profile').send({ name: 'Name 1' }),
        authRequest.put('/api/users/profile').send({ name: 'Name 2' }),
        authRequest.put('/api/users/profile').send({ name: 'Name 3' }),
      ];

      const responses = await Promise.allSettled(updateRequests);

      // At least one should succeed
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful.length).toBeGreaterThanOrEqual(1);
    });
  });
}); 