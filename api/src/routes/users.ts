// User routes - user profile and settings
import { Router } from 'express';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import { validateRequest, commonSchemas } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import db from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { User } from '@shared/types/index.js';

const router = Router();

// Validation schemas
const updateProfileSchema = {
  body: Joi.object({
    email: commonSchemas.email.optional(),
  }),
};

const changePasswordSchema = {
  body: Joi.object({
    current_password: Joi.string().required(),
    new_password: commonSchemas.password,
  }),
};

// Get current user profile
router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  const result = await db.query(
    'SELECT id, email, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user: User = {
    id: result.rows[0].id,
    email: result.rows[0].email,
    created_at: result.rows[0].created_at,
  };

  res.json({
    success: true,
    data: user,
  });
}));

// Update user profile
router.put('/profile', validateRequest(updateProfileSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { email } = req.body;

  if (!email) {
    throw new AppError('No updates provided', 400);
  }

  // Check if email is already taken by another user
  const existingUser = await db.query(
    'SELECT id FROM users WHERE email = $1 AND id != $2',
    [email.toLowerCase(), userId]
  );

  if (existingUser.rows.length > 0) {
    throw new AppError('Email already in use', 409);
  }

  // Update user
  const result = await db.query(
    'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, created_at',
    [email.toLowerCase(), userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user: User = {
    id: result.rows[0].id,
    email: result.rows[0].email,
    created_at: result.rows[0].created_at,
  };

  logger.info('User profile updated', { userId, newEmail: email });

  res.json({
    success: true,
    data: user,
  });
}));

// Change password
router.put('/password', validateRequest(changePasswordSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { current_password, new_password } = req.body;

  // Get current password hash
  const userResult = await db.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

  // Update password
  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newPasswordHash, userId]
  );

  logger.info('User password changed', { userId });

  res.json({
    success: true,
    data: {
      message: 'Password updated successfully',
    },
  });
}));

// Delete user account
router.delete('/account', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  // Delete user (cascade will delete all related data)
  const result = await db.query(
    'DELETE FROM users WHERE id = $1 RETURNING email',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  logger.info('User account deleted', { userId, email: result.rows[0].email });

  res.json({
    success: true,
    data: {
      message: 'Account deleted successfully',
    },
  });
}));

// Get user statistics
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  const [userInfo, sessionStats, eventStats] = await Promise.all([
    // User basic info
    db.query(
      'SELECT email, created_at FROM users WHERE id = $1',
      [userId]
    ),
    
    // Session statistics
    db.query(
      `SELECT 
         COUNT(*) as total_sessions,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as sessions_last_30d,
         AVG(confidence) as avg_confidence
       FROM sessions 
       WHERE user_id = $1`,
      [userId]
    ),
    
    // Event statistics
    db.query(
      `SELECT 
         COUNT(*) as total_events,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as events_last_7d,
         COUNT(DISTINCT window_id) as unique_windows
       FROM events 
       WHERE user_id = $1`,
      [userId]
    ),
  ]);

  if (userInfo.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const accountAge = Math.floor(
    (new Date().getTime() - new Date(userInfo.rows[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  res.json({
    success: true,
    data: {
      user: {
        email: userInfo.rows[0].email,
        created_at: userInfo.rows[0].created_at,
        account_age_days: accountAge,
      },
      sessions: {
        total: parseInt(sessionStats.rows[0].total_sessions || '0'),
        last_30_days: parseInt(sessionStats.rows[0].sessions_last_30d || '0'),
        avg_confidence: parseFloat(sessionStats.rows[0].avg_confidence || '0'),
      },
      events: {
        total: parseInt(eventStats.rows[0].total_events || '0'),
        last_7_days: parseInt(eventStats.rows[0].events_last_7d || '0'),
        unique_windows: parseInt(eventStats.rows[0].unique_windows || '0'),
      },
    },
  });
}));

export { router as userRoutes };
