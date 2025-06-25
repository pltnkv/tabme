import { Router } from 'express';
import { body, param } from 'express-validator';
import spaceController from '../controllers/space.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All space routes require authentication
router.use(authenticate);

// Space validation
const spaceValidation = [
  body('title').notEmpty().trim().withMessage('Space title is required'),
  body('position').notEmpty().withMessage('Position is required')
];

const updateSpaceValidation = [
  body('title').optional().notEmpty().trim().withMessage('Space title cannot be empty')
];

const positionsValidation = [
  body('positions').isArray().withMessage('Positions must be an array'),
  body('positions.*.spaceId').notEmpty().withMessage('Space ID is required'),
  body('positions.*.position').notEmpty().withMessage('Position is required')
];

const addUserValidation = [
  body('targetUserId').notEmpty().withMessage('Target user ID is required'),
  body('position').notEmpty().withMessage('Position is required')
];

/**
 * @openapi
 * /api/spaces:
 *   get:
 *     tags:
 *       - Spaces
 *     summary: Get user spaces
 *     description: Retrieve all spaces for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user spaces
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Space'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', spaceController.getUserSpaces);

/**
 * @openapi
 * /api/spaces/{spaceId}:
 *   get:
 *     tags:
 *       - Spaces
 *     summary: Get space by ID
 *     description: Retrieve a specific space by its ID
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
 *         description: Space details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Space'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Space not found
 *       500:
 *         description: Internal server error
 */
router.get('/:spaceId', param('spaceId').isUUID(), spaceController.getSpaceById);

/**
 * @openapi
 * /api/spaces:
 *   post:
 *     tags:
 *       - Spaces
 *     summary: Create a new space
 *     description: Create a new space for the authenticated user
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
 *             properties:
 *               title:
 *                 type: string
 *                 description: The space title
 *               position:
 *                 type: string
 *                 description: The position for ordering spaces
 *     responses:
 *       201:
 *         description: Space created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Space'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', spaceValidation, spaceController.createSpace);

/**
 * @openapi
 * /api/spaces/{spaceId}:
 *   put:
 *     tags:
 *       - Spaces
 *     summary: Update a space
 *     description: Update an existing space
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The space title
 *     responses:
 *       200:
 *         description: Space updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Space'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Space not found
 *       500:
 *         description: Internal server error
 */
router.put('/:spaceId', param('spaceId').isUUID(), updateSpaceValidation, spaceController.updateSpace);

/**
 * @openapi
 * /api/spaces/{spaceId}:
 *   delete:
 *     tags:
 *       - Spaces
 *     summary: Delete a space
 *     description: Delete an existing space
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
 *         description: Space deleted successfully
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
 *         description: Space not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:spaceId', param('spaceId').isUUID(), spaceController.deleteSpace);

/**
 * @openapi
 * /api/spaces/positions:
 *   put:
 *     tags:
 *       - Spaces
 *     summary: Update space positions
 *     description: Update the positions of multiple spaces for ordering
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - positions
 *             properties:
 *               positions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - spaceId
 *                     - position
 *                   properties:
 *                     spaceId:
 *                       type: string
 *                       format: uuid
 *                     position:
 *                       type: string
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
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/positions', positionsValidation, spaceController.updateSpacePositions);

/**
 * @openapi
 * /api/spaces/{spaceId}/users:
 *   get:
 *     tags:
 *       - Spaces
 *     summary: Get space users
 *     description: Get all users that have access to a space
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
 *         description: List of space users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Space not found
 *       500:
 *         description: Internal server error
 */
router.get('/:spaceId/users', param('spaceId').isUUID(), spaceController.getSpaceUsers);

/**
 * @openapi
 * /api/spaces/{spaceId}/users:
 *   post:
 *     tags:
 *       - Spaces
 *     summary: Add user to space
 *     description: Add a user to a space with specified permissions
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetUserId
 *               - position
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 format: uuid
 *                 description: The user ID to add to the space
 *               position:
 *                 type: string
 *                 description: The position for the user in the space
 *     responses:
 *       201:
 *         description: User added to space successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Space not found
 *       500:
 *         description: Internal server error
 */
router.post('/:spaceId/users', param('spaceId').isUUID(), addUserValidation, spaceController.addUserToSpace);

/**
 * @openapi
 * /api/spaces/{spaceId}/users/{targetUserId}:
 *   delete:
 *     tags:
 *       - Spaces
 *     summary: Remove user from space
 *     description: Remove a user's access to a space
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
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID to remove from the space
 *     responses:
 *       200:
 *         description: User removed from space successfully
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
 *         description: Space or user not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:spaceId/users/:targetUserId', 
  param('spaceId').isUUID(), 
  param('targetUserId').isUUID(), 
  spaceController.removeUserFromSpace
);

export default router; 