import { Router } from 'express';
import { body, param, query } from 'express-validator';
import itemController from '../controllers/item.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All item routes require authentication
router.use(authenticate);

// Item validation
const itemValidation = [
  body('title').notEmpty().trim().withMessage('Item title is required'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('folderId').notEmpty().isUUID().withMessage('Valid folder ID is required'),
  body('favicon').optional().isURL().withMessage('Favicon must be a valid URL')
];

const updateItemValidation = [
  body('title').optional().notEmpty().trim().withMessage('Item title cannot be empty'),
  body('url').optional().isURL().withMessage('URL must be valid'),
  body('position').optional().notEmpty().withMessage('Position cannot be empty'),
  body('favicon').optional().isURL().withMessage('Favicon must be a valid URL')
];

const moveItemValidation = [
  body('targetFolderId').notEmpty().isUUID().withMessage('Valid target folder ID is required'),
  body('position').notEmpty().withMessage('Position is required')
];

const bulkUpdateValidation = [
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.id').notEmpty().isUUID().withMessage('Valid item ID is required'),
  body('updates.*.position').notEmpty().withMessage('Position is required')
];

/**
 * @openapi
 * /api/items/folder/{folderId}:
 *   get:
 *     tags:
 *       - Items
 *     summary: Get items in a folder
 *     description: Retrieve all bookmark items within a specific folder
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
 *         description: List of items in the folder
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BookmarkItem'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Folder not found
 *       500:
 *         description: Internal server error
 */
router.get('/folder/:folderId', param('folderId').isUUID(), itemController.getFolderItems);

/**
 * @openapi
 * /api/items/{itemId}:
 *   get:
 *     tags:
 *       - Items
 *     summary: Get item by ID
 *     description: Retrieve a specific bookmark item by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The item ID
 *     responses:
 *       200:
 *         description: Item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookmarkItem'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.get('/:itemId', param('itemId').isUUID(), itemController.getItemById);

/**
 * @openapi
 * /api/items:
 *   post:
 *     tags:
 *       - Items
 *     summary: Create a new bookmark item
 *     description: Create a new bookmark item within a folder
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
 *               - url
 *               - position
 *               - folderId
 *             properties:
 *               title:
 *                 type: string
 *                 description: The bookmark title
 *                 example: Google
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: The bookmark URL
 *                 example: https://www.google.com
 *               position:
 *                 type: string
 *                 description: The position for ordering items
 *                 example: a0
 *               folderId:
 *                 type: string
 *                 format: uuid
 *                 description: The folder ID where the item will be created
 *               favicon:
 *                 type: string
 *                 format: uri
 *                 description: URL to the bookmark's favicon
 *                 example: https://www.google.com/favicon.ico
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookmarkItem'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', itemValidation, itemController.createItem);

/**
 * @openapi
 * /api/items/{itemId}:
 *   put:
 *     tags:
 *       - Items
 *     summary: Update a bookmark item
 *     description: Update an existing bookmark item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The bookmark title
 *                 example: Updated Google
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: The bookmark URL
 *                 example: https://www.google.com
 *               position:
 *                 type: string
 *                 description: The position for ordering items
 *                 example: a1
 *               favicon:
 *                 type: string
 *                 format: uri
 *                 description: URL to the bookmark's favicon
 *                 example: https://www.google.com/favicon.ico
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookmarkItem'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.put('/:itemId', param('itemId').isUUID(), updateItemValidation, itemController.updateItem);

/**
 * @openapi
 * /api/items/{itemId}:
 *   delete:
 *     tags:
 *       - Items
 *     summary: Delete a bookmark item
 *     description: Delete an existing bookmark item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The item ID
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Item deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:itemId', param('itemId').isUUID(), itemController.deleteItem);

/**
 * @openapi
 * /api/items/{itemId}/move:
 *   put:
 *     tags:
 *       - Items
 *     summary: Move item to another folder
 *     description: Move a bookmark item to a different folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetFolderId
 *               - position
 *             properties:
 *               targetFolderId:
 *                 type: string
 *                 format: uuid
 *                 description: The target folder ID
 *               position:
 *                 type: string
 *                 description: The position in the target folder
 *                 example: a0
 *     responses:
 *       200:
 *         description: Item moved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookmarkItem'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item or folder not found
 *       500:
 *         description: Internal server error
 */
router.put('/:itemId/move', param('itemId').isUUID(), moveItemValidation, itemController.moveItem);

/**
 * @openapi
 * /api/items/bulk-positions:
 *   put:
 *     tags:
 *       - Items
 *     summary: Bulk update item positions
 *     description: Update positions of multiple bookmark items at once
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - position
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: Item ID
 *                     position:
 *                       type: string
 *                       description: New position
 *     responses:
 *       200:
 *         description: Positions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Positions updated successfully
 *                 updated:
 *                   type: integer
 *                   description: Number of items updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/bulk-positions', bulkUpdateValidation, itemController.bulkUpdatePositions);

export default router; 