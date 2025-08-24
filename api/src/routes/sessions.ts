// Sessions routes - manage tab sessions
import { Router } from 'express';
import Joi from 'joi';
import { validateRequest, commonSchemas } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import db from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { Session, Tab } from '@shared/types/index.js';

const router = Router();

// Validation schemas
const getSessionsSchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    mode: Joi.string().valid('strict', 'loose').optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
  }),
};

const sessionParamsSchema = {
  params: Joi.object({
    sessionId: commonSchemas.uuid,
  }),
};

const restoreSessionSchema = {
  body: Joi.object({
    sessionId: commonSchemas.uuid,
  }),
};

// Get sessions for a user
router.get('/', validateRequest(getSessionsSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { limit, offset, mode, from, to } = req.query as any;
  const userId = req.userId!;

  // Build query using the session_stats view
  let query = 'SELECT * FROM session_stats WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (mode) {
    query += ` AND mode = $${paramIndex}`;
    params.push(mode);
    paramIndex++;
  }

  if (from) {
    query += ` AND last_active_at >= $${paramIndex}`;
    params.push(from);
    paramIndex++;
  }

  if (to) {
    query += ` AND last_active_at <= $${paramIndex}`;
    params.push(to);
    paramIndex++;
  }

  query += ` ORDER BY last_active_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  // Transform database rows to match Session interface
  const sessions: Session[] = result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    summary: row.summary,
    confidence: parseFloat(row.confidence || '0'),
    started_at: row.started_at,
    last_active_at: row.last_active_at,
    screenshot_url: row.screenshot_url,
    mode: row.mode,
  }));

  res.json({
    success: true,
    data: {
      sessions,
      total: sessions.length,
      limit,
      offset,
    },
  });
}));

// Get a specific session
router.get('/:sessionId', validateRequest(sessionParamsSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { sessionId } = req.params;
  const userId = req.userId!;

  const result = await db.query(
    'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Session not found', 404);
  }

  const session: Session = {
    id: result.rows[0].id,
    user_id: result.rows[0].user_id,
    title: result.rows[0].title,
    summary: result.rows[0].summary,
    confidence: parseFloat(result.rows[0].confidence || '0'),
    started_at: result.rows[0].started_at,
    last_active_at: result.rows[0].last_active_at,
    screenshot_url: result.rows[0].screenshot_url,
    mode: result.rows[0].mode,
  };

  res.json({
    success: true,
    data: session,
  });
}));

// Get tabs for a session
router.get('/:sessionId/tabs', validateRequest(sessionParamsSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { sessionId } = req.params;
  const userId = req.userId!;

  // Verify session belongs to user
  const sessionResult = await db.query(
    'SELECT id FROM sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  if (sessionResult.rows.length === 0) {
    throw new AppError('Session not found', 404);
  }

  // Get tabs for the session
  const tabsResult = await db.query(
    'SELECT * FROM tabs WHERE session_id = $1 ORDER BY order_index ASC',
    [sessionId]
  );

  const tabs: Tab[] = tabsResult.rows.map(row => ({
    id: row.id,
    session_id: row.session_id,
    url: row.url,
    title: row.title,
    pinned: row.pinned,
    order_index: row.order_index,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
  }));

  res.json({
    success: true,
    data: {
      tabs,
      session_id: sessionId,
      total: tabs.length,
    },
  });
}));

// Restore session (open tabs in browser)
router.post('/restore', validateRequest(restoreSessionSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { sessionId } = req.body;
  const userId = req.userId!;

  // Get session and its tabs
  const [sessionResult, tabsResult] = await Promise.all([
    db.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    ),
    db.query(
      'SELECT * FROM tabs WHERE session_id = $1 ORDER BY order_index ASC',
      [sessionId]
    ),
  ]);

  if (sessionResult.rows.length === 0) {
    throw new AppError('Session not found', 404);
  }

  const session = sessionResult.rows[0];
  const tabs = tabsResult.rows;

  if (tabs.length === 0) {
    throw new AppError('No tabs found for this session', 404);
  }

  // In a real implementation, this would send a message to the extension
  // to open the tabs. For now, we'll just log the restore request.
  logger.info('Session restore requested', {
    userId,
    sessionId,
    sessionTitle: session.title,
    tabCount: tabs.length,
    urls: tabs.map(t => t.url),
  });

  // Update session's last_active_at to show it was recently accessed
  await db.query(
    'UPDATE sessions SET last_active_at = NOW() WHERE id = $1',
    [sessionId]
  );

  res.json({
    success: true,
    data: {
      session: {
        id: session.id,
        title: session.title,
        tab_count: tabs.length,
      },
      message: 'Session restore initiated',
    },
  });
}));

// Delete a session
router.delete('/:sessionId', validateRequest(sessionParamsSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { sessionId } = req.params;
  const userId = req.userId!;

  // Delete session (cascade will delete tabs)
  const result = await db.query(
    'DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING title',
    [sessionId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Session not found', 404);
  }

  logger.info('Session deleted', {
    userId,
    sessionId,
    sessionTitle: result.rows[0].title,
  });

  res.json({
    success: true,
    data: {
      message: 'Session deleted successfully',
      deleted_session: {
        id: sessionId,
        title: result.rows[0].title,
      },
    },
  });
}));

// Get session statistics
router.get('/stats/overview', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  const [totalSessions, avgTabsPerSession, recentSessions, sessionsByMode] = await Promise.all([
    // Total sessions
    db.query('SELECT COUNT(*) as total FROM sessions WHERE user_id = $1', [userId]),
    
    // Average tabs per session
    db.query(
      `SELECT AVG(tab_count) as avg_tabs 
       FROM session_stats 
       WHERE user_id = $1`,
      [userId]
    ),
    
    // Recent sessions (last 7 days)
    db.query(
      `SELECT COUNT(*) as count 
       FROM sessions 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    ),
    
    // Sessions by mode
    db.query(
      `SELECT mode, COUNT(*) as count 
       FROM sessions 
       WHERE user_id = $1 
       GROUP BY mode`,
      [userId]
    ),
  ]);

  res.json({
    success: true,
    data: {
      total_sessions: parseInt(totalSessions.rows[0].total),
      avg_tabs_per_session: parseFloat(avgTabsPerSession.rows[0].avg_tabs || '0'),
      recent_sessions_7d: parseInt(recentSessions.rows[0].count),
      sessions_by_mode: sessionsByMode.rows.reduce((acc, row) => {
        acc[row.mode] = parseInt(row.count);
        return acc;
      }, {}),
    },
  });
}));

export { router as sessionRoutes };
