import { Router } from 'express';
import { body, param } from 'express-validator';
import folderController from '../controllers/folder.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All folder routes require authentication
router.use(authenticate);

// Folder validation
const folderValidation = [
  body('title').notEmpty().trim().withMessage('Folder title is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('spaceId').notEmpty().isUUID().withMessage('Valid space ID is required'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color')
];

const updateFolderValidation = [
  body('title').optional().notEmpty().trim().withMessage('Folder title cannot be empty'),
  body('position').optional().notEmpty().withMessage('Position cannot be empty'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
  body('spaceId').optional().isUUID().withMessage('Space ID must be a valid UUID')
];

const syncValidation = [
  body('targetSpaceId').notEmpty().isUUID().withMessage('Valid target space ID is required'),
  body('position').notEmpty().withMessage('Position is required')
];

const folderSyncValidation = [
  body('sourceFolderId').notEmpty().isUUID().withMessage('Valid source folder ID is required'),
  body('targetFolderId').notEmpty().isUUID().withMessage('Valid target folder ID is required'),
  body('syncDirection').optional().isIn(['BIDIRECTIONAL', 'ONE_WAY']),
  body('conflictStrategy').optional().isIn(['LATEST_WINS', 'MANUAL_RESOLVE', 'SOURCE_WINS'])
];

/**
 * @openapi
 * /api/folders/space/{spaceId}:
 *   get:
 *     tags:
 *       - Folders
 *     summary: Get folders in a space
 *     description: Retrieve all folders within a specific space
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The space ID
 *     responses:
 *       200:
 *         description: List of folders in the space
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Folder'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Space not found
 *       500:
 *         description: Internal server error
 */
router.get('/space/:spaceId', param('spaceId').isUUID(), folderController.getSpaceFolders);

/**
 * @openapi
 * /api/folders/{folderId}:
 *   get:
 *     tags:
 *       - Folders
 *     summary: Get folder by ID
 *     description: Retrieve a specific folder by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The folder ID
 *     responses:
 *       200:
 *         description: Folder details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Folder not found
 *       500:
 *         description: Internal server error
 */
router.get('/:folderId', param('folderId').isUUID(), folderController.getFolderById);

/**
 * @openapi
 * /api/folders:
 *   post:
 *     tags:
 *       - Folders
 *     summary: Create a new folder
 *     description: Create a new folder within a space
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - position
 *               - spaceId
 *             properties:
 *               title:
 *                 type: string
 *                 description: The folder title
 *               position:
 *                 type: string
 *                 description: The position for ordering folders
 *               spaceId:
 *                 type: string
 *                 format: uuid
 *                 description: The space ID where the folder will be created
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-F]{6}$'
 *                 description: Hex color for the folder
 *     responses:
 *       201:
 *         description: Folder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', folderValidation, folderController.createFolder);

/**
 * @openapi
 * /api/folders/{folderId}:
 *   put:
 *     tags:
 *       - Folders
 *     summary: Update a folder
 *     description: Update an existing folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The folder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The folder title
 *               position:
 *                 type: string
 *                 description: The position for ordering folders
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-F]{6}$'
 *                 description: Hex color for the folder
 *     responses:
 *       200:
 *         description: Folder updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Folder not found
 *       500:
 *         description: Internal server error
 */
router.put('/:folderId', param('folderId').isUUID(), updateFolderValidation, folderController.updateFolder);

/**
 * @openapi
 * /api/folders/{folderId}:
 *   delete:
 *     tags:
 *       - Folders
 *     summary: Delete a folder
 *     description: Delete an existing folder and all its items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The folder ID
 *     responses:
 *       200:
 *         description: Folder deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Folder not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:folderId', param('folderId').isUUID(), folderController.deleteFolder);

/**
 * @openapi
 * /api/folders/{folderId}/sync-copy:
 *   post:
 *     tags:
 *       - Folders
 *     summary: Create synced copy of folder
 *     description: Create a synchronized copy of a folder in another space
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The source folder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetSpaceId
 *               - position
 *             properties:
 *               targetSpaceId:
 *                 type: string
 *                 format: uuid
 *                 description: The target space ID where the copy will be created
 *               position:
 *                 type: string
 *                 description: The position for the copied folder
 *     responses:
 *       201:
 *         description: Synced copy created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Source folder not found
 *       500:
 *         description: Internal server error
 */
router.post('/:folderId/sync-copy', param('folderId').isUUID(), syncValidation, folderController.createSyncedCopy);

/**
 * @openapi
 * /api/folders/sync:
 *   post:
 *     tags:
 *       - Folders
 *     summary: Create folder sync relationship
 *     description: Create a synchronization relationship between two folders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceFolderId
 *               - targetFolderId
 *             properties:
 *               sourceFolderId:
 *                 type: string
 *                 format: uuid
 *                 description: The source folder ID
 *               targetFolderId:
 *                 type: string
 *                 format: uuid
 *                 description: The target folder ID
 *               syncDirection:
 *                 type: string
 *                 enum: [BIDIRECTIONAL, ONE_WAY]
 *                 description: Sync direction
 *               conflictStrategy:
 *                 type: string
 *                 enum: [LATEST_WINS, MANUAL_RESOLVE, SOURCE_WINS]
 *                 description: Conflict resolution strategy
 *     responses:
 *       201:
 *         description: Folder sync created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/sync', folderSyncValidation, folderController.createFolderSync);

/**
 * @openapi
 * /api/folders/{folderId}/syncs:
 *   get:
 *     tags:
 *       - Folders
 *     summary: Get folder sync relationships
 *     description: Get all sync relationships for a folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The folder ID
 *     responses:
 *       200:
 *         description: Folder sync relationships
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   sourceFolderId:
 *                     type: string
 *                     format: uuid
 *                   targetFolderId:
 *                     type: string
 *                     format: uuid
 *                   syncDirection:
 *                     type: string
 *                     enum: [BIDIRECTIONAL, ONE_WAY]
 *                   status:
 *                     type: string
 *                     enum: [ACTIVE, PAUSED]
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Folder not found
 *       500:
 *         description: Internal server error
 */
router.get('/:folderId/syncs', param('folderId').isUUID(), folderController.getFolderSyncs);

/**
 * @openapi
 * /api/folders/sync/{syncId}/pause:
 *   put:
 *     tags:
 *       - Folders
 *     summary: Pause folder sync
 *     description: Pause a folder synchronization relationship
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: syncId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The sync relationship ID
 *     responses:
 *       200:
 *         description: Sync paused successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sync relationship not found
 *       500:
 *         description: Internal server error
 */
router.put('/sync/:syncId/pause', param('syncId').isUUID(), folderController.pauseFolderSync);

/**
 * @openapi
 * /api/folders/sync/{syncId}/resume:
 *   put:
 *     tags:
 *       - Folders
 *     summary: Resume folder sync
 *     description: Resume a paused folder synchronization relationship
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: syncId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The sync relationship ID
 *     responses:
 *       200:
 *         description: Sync resumed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sync relationship not found
 *       500:
 *         description: Internal server error
 */
router.put('/sync/:syncId/resume', param('syncId').isUUID(), folderController.resumeFolderSync);

/**
 * @openapi
 * /api/folders/sync/{syncId}:
 *   delete:
 *     tags:
 *       - Folders
 *     summary: Remove folder sync
 *     description: Remove a folder synchronization relationship
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: syncId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The sync relationship ID
 *     responses:
 *       200:
 *         description: Sync relationship removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sync relationship not found
 *       500:
 *         description: Internal server error
 */
router.delete('/sync/:syncId', param('syncId').isUUID(), folderController.removeFolderSync);

export default router; 