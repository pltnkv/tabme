import { Router } from 'express';
import { body } from 'express-validator';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Profile validation
const profileValidation = [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail()
];

// Settings validation
const settingsValidation = [
  body('theme').optional().isIn(['light', 'dark']),
  body('reverseTabOrder').optional().isBoolean(),
  body('enableTooltips').optional().isBoolean(),
  body('enableKeyboardShortcuts').optional().isBoolean(),
  body('autoRefreshFavicons').optional().isBoolean()
];

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user profile
 *     description: Retrieve the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/profile', userController.getProfile);

/**
 * @openapi
 * /api/users/profile:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's display name
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/profile', profileValidation, userController.updateProfile);

/**
 * @openapi
 * /api/users/account:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user account
 *     description: Permanently delete the authenticated user's account and all associated data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/account', userController.deleteAccount);

/**
 * @openapi
 * /api/users/settings:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user settings
 *     description: Retrieve the authenticated user's application settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSettings'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/settings', userController.getUserSettings);

/**
 * @openapi
 * /api/users/settings:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user settings
 *     description: Update the authenticated user's application settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *                 description: UI theme preference
 *                 example: dark
 *               reverseTabOrder:
 *                 type: boolean
 *                 description: Whether to reverse tab order in open tabs panel
 *                 example: false
 *               enableTooltips:
 *                 type: boolean
 *                 description: Whether to show tooltips
 *                 example: true
 *               enableKeyboardShortcuts:
 *                 type: boolean
 *                 description: Whether to enable keyboard shortcuts
 *                 example: true
 *               autoRefreshFavicons:
 *                 type: boolean
 *                 description: Whether to automatically refresh favicons
 *                 example: true
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSettings'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/settings', settingsValidation, userController.updateUserSettings);

export default router; 