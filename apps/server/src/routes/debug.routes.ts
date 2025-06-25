import { Router } from 'express';
import debugController from '../controllers/debug.controller';

const router = Router();

// Debug routes - NO AUTHENTICATION for debugging purposes
// These should ONLY be enabled in development/testing environments

// Get all users
router.get('/users', debugController.getAllUsers);

// Get all spaces
router.get('/spaces', debugController.getAllSpaces);

// Get all folders
router.get('/folders', debugController.getAllFolders);

// Get database statistics
router.get('/stats', debugController.getDatabaseStats);

export default router; 