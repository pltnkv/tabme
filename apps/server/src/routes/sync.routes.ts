import { Router } from 'express';
import { body, query } from 'express-validator';
import syncController from '../controllers/sync.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All sync routes require authentication
router.use(authenticate);

// Sync validation
const syncChangesValidation = [
  body('changes').isArray().withMessage('Changes must be an array'),
  body('changes.*.operation').isIn(['CREATE', 'UPDATE', 'DELETE', 'RESTORE']).withMessage('Invalid operation'),
  body('changes.*.entityType').notEmpty().withMessage('Entity type is required'),
  body('changes.*.entityId').notEmpty().withMessage('Entity ID is required')
];

const syncLogValidation = [
  body('operation').isIn(['CREATE', 'UPDATE', 'DELETE', 'RESTORE']).withMessage('Invalid operation'),
  body('entityType').notEmpty().withMessage('Entity type is required'),
  body('entityId').notEmpty().withMessage('Entity ID is required')
];

/**
 * @openapi
 * /api/sync/full:
 *   get:
 *     tags:
 *       - Sync
 *     summary: Get full sync data
 *     description: Retrieve all user data for complete synchronization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full sync data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 spaces:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Space'
 *                 folders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Folder'
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BookmarkItem'
 *                 widgets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User data not found
 *       500:
 *         description: Internal server error
 */
router.get('/full', syncController.getFullSyncData);

/**
 * @openapi
 * /api/sync/changes:
 *   get:
 *     tags:
 *       - Sync
 *     summary: Get sync changes
 *     description: Retrieve incremental sync changes since last sync version
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lastSyncVersion
 *         schema:
 *           type: integer
 *         description: Last sync version number
 *       - in: query
 *         name: entityTypes
 *         schema:
 *           type: string
 *         description: Comma-separated list of entity types to sync
 *     responses:
 *       200:
 *         description: Sync changes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 changes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SyncChange'
 *                 currentVersion:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/changes', syncController.getSyncChanges);

/**
 * @openapi
 * /api/sync/apply:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Apply sync changes
 *     description: Apply a batch of sync changes to the server
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - changes
 *             properties:
 *               changes:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SyncChange'
 *     responses:
 *       200:
 *         description: Sync changes applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Validation error or some changes failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/apply', syncChangesValidation, syncController.applySyncChanges);

/**
 * @openapi
 * /api/sync/log:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Create sync log entry
 *     description: Create a new sync log entry for tracking changes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operation
 *               - entityType
 *               - entityId
 *             properties:
 *               operation:
 *                 type: string
 *                 enum: [CREATE, UPDATE, DELETE, RESTORE]
 *               entityType:
 *                 type: string
 *               entityId:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Sync log created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncLog'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/log', syncLogValidation, syncController.createSyncLog);

/**
 * @openapi
 * /api/sync/stats:
 *   get:
 *     tags:
 *       - Sync
 *     summary: Get user sync statistics
 *     description: Retrieve sync statistics for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lastSyncAt:
 *                   type: string
 *                   format: date-time
 *                 syncCount:
 *                   type: integer
 *                 dataVersion:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', syncController.getUserSyncStats);

/**
 * @openapi
 * /api/sync/cleanup:
 *   delete:
 *     tags:
 *       - Sync
 *     summary: Cleanup old sync logs
 *     description: Remove old sync logs (admin endpoint)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysToKeep
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to keep sync logs
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/cleanup', syncController.cleanupOldSyncLogs);

export default router; 