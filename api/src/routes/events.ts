// Events routes - handle tab events from extension
import { Router } from 'express';
import Joi from 'joi';
import { validateRequest, commonSchemas } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import db from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { Event, EventType } from '@shared/types/index.js';

const router = Router();

// Validation schemas
const eventSchema = Joi.object({
  window_id: Joi.number().integer().required(),
  tab_id: Joi.number().integer().required(),
  type: Joi.string().valid('open', 'update', 'activate', 'close').required(),
  title: Joi.string().max(1000).required(),
  url: Joi.string().max(2048).required(),
  ts: Joi.date().iso().required(),
});

const batchEventsSchema = {
  body: Joi.object({
    events: Joi.array().items(eventSchema).min(1).max(100).required(),
  }),
};

const getEventsSchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
    window_id: Joi.number().integer().optional(),
    type: Joi.string().valid('open', 'update', 'activate', 'close').optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
  }),
};

// Batch create events (primary endpoint for extension)
router.post('/batch', validateRequest(batchEventsSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { events } = req.body;
  const userId = req.userId!;

  if (!events || events.length === 0) {
    throw new AppError('No events provided', 400);
  }

  // Insert events in a transaction
  const result = await db.transaction(async (client) => {
    const insertedEvents = [];
    
    for (const event of events) {
      const insertResult = await client.query(
        `INSERT INTO events (user_id, window_id, tab_id, type, title, url, ts) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, created_at`,
        [userId, event.window_id, event.tab_id, event.type, event.title, event.url, event.ts]
      );
      
      insertedEvents.push({
        ...event,
        id: insertResult.rows[0].id,
        user_id: userId,
        created_at: insertResult.rows[0].created_at,
      });
    }
    
    return insertedEvents;
  });

  logger.info('Events batch processed', { 
    userId, 
    eventCount: events.length,
    types: events.map(e => e.type),
  });

  res.json({
    success: true,
    data: {
      synced_count: result.length,
      events: result,
    },
  });
}));

// Get events for a user
router.get('/', validateRequest(getEventsSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { limit, offset, window_id, type, from, to } = req.query as any;
  const userId = req.userId!;

  // Build query
  let query = 'SELECT * FROM events WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (window_id) {
    query += ` AND window_id = $${paramIndex}`;
    params.push(window_id);
    paramIndex++;
  }

  if (type) {
    query += ` AND type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (from) {
    query += ` AND ts >= $${paramIndex}`;
    params.push(from);
    paramIndex++;
  }

  if (to) {
    query += ` AND ts <= $${paramIndex}`;
    params.push(to);
    paramIndex++;
  }

  query += ` ORDER BY ts DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  res.json({
    success: true,
    data: {
      events: result.rows,
      total: result.rows.length,
      limit,
      offset,
    },
  });
}));

// Get event statistics
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  // Get various statistics
  const [totalEvents, eventsByType, recentActivity] = await Promise.all([
    // Total events count
    db.query('SELECT COUNT(*) as total FROM events WHERE user_id = $1', [userId]),
    
    // Events by type
    db.query(
      `SELECT type, COUNT(*) as count 
       FROM events 
       WHERE user_id = $1 
       GROUP BY type`,
      [userId]
    ),
    
    // Recent activity (last 24 hours)
    db.query(
      `SELECT DATE_TRUNC('hour', ts) as hour, COUNT(*) as count
       FROM events 
       WHERE user_id = $1 AND ts >= NOW() - INTERVAL '24 hours'
       GROUP BY hour
       ORDER BY hour`,
      [userId]
    ),
  ]);

  res.json({
    success: true,
    data: {
      total_events: parseInt(totalEvents.rows[0].total),
      events_by_type: eventsByType.rows.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count);
        return acc;
      }, {}),
      recent_activity: recentActivity.rows.map(row => ({
        hour: row.hour,
        count: parseInt(row.count),
      })),
    },
  });
}));

// Delete old events (cleanup endpoint)
router.delete('/cleanup', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { days = 30 } = req.query;

  const result = await db.query(
    'DELETE FROM events WHERE user_id = $1 AND created_at < NOW() - INTERVAL \'1 day\' * $2',
    [userId, days]
  );

  logger.info('Events cleanup completed', { 
    userId, 
    deletedCount: result.rowCount,
    daysKept: days,
  });

  res.json({
    success: true,
    data: {
      deleted_count: result.rowCount,
      days_kept: days,
    },
  });
}));

export { router as eventRoutes };
