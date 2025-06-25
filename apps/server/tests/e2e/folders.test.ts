import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../setup/app';
import { cleanupDatabase, testDb } from '../setup/database';
import { 
  registerUser, 
  makeAuthenticatedRequest,
  expectUnauthorized,
  expectNotFound,
  expectValidationError,
  generateUniqueEmail,
  AuthenticatedUser,
  createDefaultSpace,
  createDefaultFolder,
  createDefaultItem
} from '../setup/testHelpers';

describe('Folder Management API', () => {
  let app: Express;
  let testUser: AuthenticatedUser;
  let authRequest: any;
  let testSpace: any;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await registerUser(app);
    authRequest = makeAuthenticatedRequest(testUser.token, app);
    
    // Create a default space for folder tests
    testSpace = await createDefaultSpace(testUser.id, 'Test Space');
  });

  describe('Folder CRUD Operations', () => {
    it('should register new user and create 2 folders', async () => {
      // User is already registered in beforeEach

      // Create first folder
      const folder1Response = await authRequest
        .post('/api/folders')
        .send({
          title: 'Development',
          spaceId: testSpace.id,
          position: '1000',
          color: '#10b981',
        })
        .expect(201);

      expect(folder1Response.body.title).toBe('Development');
      expect(folder1Response.body.spaceId).toBe(testSpace.id);
      expect(folder1Response.body.position).toBe('1000');
      expect(folder1Response.body.color).toBe('#10b981');

      // Create second folder
      const folder2Response = await authRequest
        .post('/api/folders')
        .send({
          title: 'Personal',
          spaceId: testSpace.id,
          position: '2000',
          color: '#f59e0b',
        })
        .expect(201);

      expect(folder2Response.body.title).toBe('Personal');
      expect(folder2Response.body.spaceId).toBe(testSpace.id);
      expect(folder2Response.body.position).toBe('2000');
      expect(folder2Response.body.color).toBe('#f59e0b');

      // Verify both folders exist in the space
      const foldersResponse = await authRequest
        .get(`/api/folders/space/${testSpace.id}`)
        .expect(200);

      expect(foldersResponse.body).toHaveLength(2);
      expect(foldersResponse.body.some((f: any) => f.title === 'Development')).toBe(true);
      expect(foldersResponse.body.some((f: any) => f.title === 'Personal')).toBe(true);
    });

    it('should change order of folders', async () => {
      // Create two folders
      const folder1 = await createDefaultFolder(testSpace.id, 'Folder A');
      const folder2 = await createDefaultFolder(testSpace.id, 'Folder B');

      // Initial order: Folder A (earlier timestamp), Folder B (later timestamp)
      let foldersResponse = await authRequest
        .get(`/api/folders/space/${testSpace.id}`)
        .expect(200);

      expect(foldersResponse.body).toHaveLength(2);

      // Change order by updating positions
      await authRequest
        .put(`/api/folders/${folder1.id}`)
        .send({
          position: '3000', // Move Folder A to later position
        })
        .expect(200);

      await authRequest
        .put(`/api/folders/${folder2.id}`)
        .send({
          position: '1000', // Move Folder B to earlier position
        })
        .expect(200);

      // Verify order has changed
      foldersResponse = await authRequest
        .get(`/api/folders/space/${testSpace.id}`)
        .expect(200);

      expect(foldersResponse.body).toHaveLength(2);
      
      // Find the folders by title and check positions
      const folderA = foldersResponse.body.find((f: any) => f.title === 'Folder A');
      const folderB = foldersResponse.body.find((f: any) => f.title === 'Folder B');
      
      expect(folderA.position).toBe('3000');
      expect(folderB.position).toBe('1000');
    });

    it('should add bookmarks to folders', async () => {
      // Create folder
      const folder = await createDefaultFolder(testSpace.id, 'Bookmarks Folder');

      // Add first bookmark
      const bookmark1Response = await authRequest
        .post('/api/items')
        .send({
          title: 'GitHub',
          url: 'https://github.com',
          folderId: folder.id,
          position: '1000',
          favicon: 'https://github.com/favicon.ico',
        })
        .expect(201);

      expect(bookmark1Response.body.title).toBe('GitHub');
      expect(bookmark1Response.body.url).toBe('https://github.com');
      expect(bookmark1Response.body.folderId).toBe(folder.id);

      // Add second bookmark
      const bookmark2Response = await authRequest
        .post('/api/items')
        .send({
          title: 'Stack Overflow',
          url: 'https://stackoverflow.com',
          folderId: folder.id,
          position: '2000',
        })
        .expect(201);

      expect(bookmark2Response.body.title).toBe('Stack Overflow');
      expect(bookmark2Response.body.url).toBe('https://stackoverflow.com');
      expect(bookmark2Response.body.folderId).toBe(folder.id);

      // Verify both bookmarks exist in the folder
      const bookmarksResponse = await authRequest
        .get(`/api/items/folder/${folder.id}`)
        .expect(200);

      expect(bookmarksResponse.body).toHaveLength(2);
      expect(bookmarksResponse.body.some((b: any) => b.title === 'GitHub')).toBe(true);
      expect(bookmarksResponse.body.some((b: any) => b.title === 'Stack Overflow')).toBe(true);
    });

    it('should move bookmarks to another folder and verify position is correct', async () => {
      // Create two folders
      const sourceFolder = await createDefaultFolder(testSpace.id, 'Source Folder');
      const targetFolder = await createDefaultFolder(testSpace.id, 'Target Folder');

      // Add bookmark to source folder
      const bookmark = await createDefaultItem(sourceFolder.id, {
        title: 'Test Bookmark',
        url: 'https://example.com',
        position: '1000',
      });

      // Verify bookmark is in source folder
      let bookmarksResponse = await authRequest
        .get(`/api/items/folder/${sourceFolder.id}`)
        .expect(200);

      expect(bookmarksResponse.body).toHaveLength(1);
      expect(bookmarksResponse.body[0].id).toBe(bookmark.id);

      // Move bookmark to target folder
      const moveResponse = await authRequest
        .put(`/api/items/${bookmark.id}/move`)
        .send({
          targetFolderId: targetFolder.id,
          position: '5000',
        })
        .expect(200);

      expect(moveResponse.body.folderId).toBe(targetFolder.id);
      expect(moveResponse.body.position).toBe('5000');

      // Verify bookmark is no longer in source folder
      bookmarksResponse = await authRequest
        .get(`/api/items/folder/${sourceFolder.id}`)
        .expect(200);

      expect(bookmarksResponse.body).toHaveLength(0);

      // Verify bookmark is now in target folder with correct position
      bookmarksResponse = await authRequest
        .get(`/api/items/folder/${targetFolder.id}`)
        .expect(200);

      expect(bookmarksResponse.body).toHaveLength(1);
      expect(bookmarksResponse.body[0].id).toBe(bookmark.id);
      expect(bookmarksResponse.body[0].position).toBe('5000');
    });

    it('should update folders and bookmarks', async () => {
      // Create folder with bookmark
      const folder = await createDefaultFolder(testSpace.id, 'Original Folder');
      const bookmark = await createDefaultItem(folder.id, {
        title: 'Original Bookmark',
        url: 'https://example.com',
      });

      // Update folder
      const folderUpdateResponse = await authRequest
        .put(`/api/folders/${folder.id}`)
        .send({
          title: 'Updated Folder Title',
          color: '#ef4444',
        })
        .expect(200);

      expect(folderUpdateResponse.body.title).toBe('Updated Folder Title');
      expect(folderUpdateResponse.body.color).toBe('#ef4444');

      // Update bookmark
      const bookmarkUpdateResponse = await authRequest
        .put(`/api/items/${bookmark.id}`)
        .send({
          title: 'Updated Bookmark Title',
          url: 'https://updated-example.com',
        })
        .expect(200);

      expect(bookmarkUpdateResponse.body.title).toBe('Updated Bookmark Title');
      expect(bookmarkUpdateResponse.body.url).toBe('https://updated-example.com');

      // Verify updates are persisted
      const folderResponse = await authRequest
        .get(`/api/folders/${folder.id}`)
        .expect(200);

      expect(folderResponse.body.title).toBe('Updated Folder Title');
      expect(folderResponse.body.color).toBe('#ef4444');

      const bookmarkResponse = await authRequest
        .get(`/api/items/${bookmark.id}`)
        .expect(200);

      expect(bookmarkResponse.body.title).toBe('Updated Bookmark Title');
      expect(bookmarkResponse.body.url).toBe('https://updated-example.com');
    });

    it('should delete bookmarks', async () => {
      // Create folder with multiple bookmarks
      const folder = await createDefaultFolder(testSpace.id, 'Test Folder');
      const bookmark1 = await createDefaultItem(folder.id, { title: 'Bookmark 1' });
      const bookmark2 = await createDefaultItem(folder.id, { title: 'Bookmark 2' });
      const bookmark3 = await createDefaultItem(folder.id, { title: 'Bookmark 3' });

      // Verify all bookmarks exist
      let bookmarksResponse = await authRequest
        .get(`/api/items/folder/${folder.id}`)
        .expect(200);

      expect(bookmarksResponse.body).toHaveLength(3);

      // Delete one bookmark
      await authRequest
        .delete(`/api/items/${bookmark2.id}`)
        .expect(200);

      // Verify bookmark is deleted
      bookmarksResponse = await authRequest
        .get(`/api/items/folder/${folder.id}`)
        .expect(200);

      expect(bookmarksResponse.body).toHaveLength(2);
      expect(bookmarksResponse.body.some((b: any) => b.id === bookmark2.id)).toBe(false);
      expect(bookmarksResponse.body.some((b: any) => b.id === bookmark1.id)).toBe(true);
      expect(bookmarksResponse.body.some((b: any) => b.id === bookmark3.id)).toBe(true);

      // Verify deleted bookmark returns 404
      await authRequest
        .get(`/api/items/${bookmark2.id}`)
        .expect(404);
    });
  });

  describe('Folder Validation and Error Handling', () => {
    it('should require authentication for folder operations', async () => {
      // Try operations without token
      await request(app)
        .get(`/api/folders/space/${testSpace.id}`)
        .expect(401);

      await request(app)
        .post('/api/folders')
        .send({
          title: 'Test Folder',
          spaceId: testSpace.id,
          position: '1000',
        })
        .expect(401);
    });

    it('should validate folder creation data', async () => {
      // Missing title
      const response1 = await authRequest
        .post('/api/folders')
        .send({
          spaceId: testSpace.id,
          position: '1000',
        });

      expectValidationError(response1, 'title');

      // Missing spaceId
      const response2 = await authRequest
        .post('/api/folders')
        .send({
          title: 'Test Folder',
          position: '1000',
        });

      expectValidationError(response2, 'spaceId');

      // Missing position
      const response3 = await authRequest
        .post('/api/folders')
        .send({
          title: 'Test Folder',
          spaceId: testSpace.id,
        });

      expectValidationError(response3, 'position');

      // Invalid spaceId format
      const response4 = await authRequest
        .post('/api/folders')
        .send({
          title: 'Test Folder',
          spaceId: 'invalid-uuid',
          position: '1000',
        });

      expectValidationError(response4, 'spaceId');
    });

    it('should handle folder access permissions', async () => {
      // Create another user
      const otherUser = await registerUser(app);
      const otherAuthRequest = makeAuthenticatedRequest(otherUser.token, app);

      // Create folder as first user
      const folder = await createDefaultFolder(testSpace.id, 'Private Folder');

      // Try to access folder as other user (should fail)
      await otherAuthRequest
        .get(`/api/folders/${folder.id}`)
        .expect(403);

      // Try to update folder as other user (should fail)
      await otherAuthRequest
        .put(`/api/folders/${folder.id}`)
        .send({ title: 'Hacked Folder' })
        .expect(403);

      // Try to delete folder as other user (should fail)
      await otherAuthRequest
        .delete(`/api/folders/${folder.id}`)
        .expect(403);
    });

    it('should handle non-existent folder operations', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await authRequest
        .get(`/api/folders/${nonExistentId}`)
        .expect(404);

      await authRequest
        .put(`/api/folders/${nonExistentId}`)
        .send({ title: 'Updated' })
        .expect(404);

      await authRequest
        .delete(`/api/folders/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('Folder and Bookmark Relationship', () => {
    it('should cascade delete bookmarks when folder is deleted', async () => {
      // Create folder with bookmarks
      const folder = await createDefaultFolder(testSpace.id, 'To Delete Folder');
      const bookmark1 = await createDefaultItem(folder.id, { title: 'Bookmark 1' });
      const bookmark2 = await createDefaultItem(folder.id, { title: 'Bookmark 2' });

      // Verify bookmarks exist
      const bookmarksResponse = await authRequest
        .get(`/api/items/folder/${folder.id}`)
        .expect(200);

      expect(bookmarksResponse.body).toHaveLength(2);

      // Delete folder
      await authRequest
        .delete(`/api/folders/${folder.id}`)
        .expect(200);

      // Verify folder is deleted
      await authRequest
        .get(`/api/folders/${folder.id}`)
        .expect(404);

      // Verify bookmarks are also deleted (cascade)
      await authRequest
        .get(`/api/items/${bookmark1.id}`)
        .expect(404);

      await authRequest
        .get(`/api/items/${bookmark2.id}`)
        .expect(404);
    });

    it('should handle bulk bookmark position updates within folder', async () => {
      // Create folder with multiple bookmarks
      const folder = await createDefaultFolder(testSpace.id, 'Bulk Update Folder');
      const bookmark1 = await createDefaultItem(folder.id, { title: 'Bookmark 1', position: '1000' });
      const bookmark2 = await createDefaultItem(folder.id, { title: 'Bookmark 2', position: '2000' });
      const bookmark3 = await createDefaultItem(folder.id, { title: 'Bookmark 3', position: '3000' });

      // Bulk update positions
      const bulkUpdateResponse = await authRequest
        .put('/api/items/bulk-positions')
        .send({
          updates: [
            { id: bookmark1.id, position: '5000' },
            { id: bookmark2.id, position: '4000' },
            { id: bookmark3.id, position: '6000' },
          ],
        })
        .expect(200);

      // Verify positions are updated
      const bookmark1Updated = await authRequest
        .get(`/api/items/${bookmark1.id}`)
        .expect(200);

      const bookmark2Updated = await authRequest
        .get(`/api/items/${bookmark2.id}`)
        .expect(200);

      const bookmark3Updated = await authRequest
        .get(`/api/items/${bookmark3.id}`)
        .expect(200);

      expect(bookmark1Updated.body.position).toBe('5000');
      expect(bookmark2Updated.body.position).toBe('4000');
      expect(bookmark3Updated.body.position).toBe('6000');
    });
  });
}); 