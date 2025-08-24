// Authentication routes
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { validateRequest, commonSchemas } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import db from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { User, AuthToken } from '@shared/types/index.js';

const router = Router();

// Validation schemas
const loginSchema = {
  body: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required(),
  }),
};

const registerSchema = {
  body: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
  }),
};

// Login endpoint
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const userResult = await db.query(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = userResult.rows[0];

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user);
  const refreshToken = generateRefreshToken(user.id);

  // Log successful login
  logger.info('User logged in', { userId: user.id, email: user.email });

  const authResponse: AuthToken = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 86400, // 24 hours
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
  };

  res.json({
    success: true,
    data: authResponse,
  });
}));

// Register endpoint
router.post('/register', validateRequest(registerSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if user already exists
  const existingUser = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw new AppError('User already exists with this email', 409);
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userResult = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email.toLowerCase(), passwordHash]
  );

  const user = userResult.rows[0];

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user);
  const refreshToken = generateRefreshToken(user.id);

  // Log successful registration
  logger.info('User registered', { userId: user.id, email: user.email });

  const authResponse: AuthToken = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 86400, // 24 hours
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
  };

  res.status(201).json({
    success: true,
    data: authResponse,
  });
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new AppError('Refresh token required', 400);
  }

  try {
    if (!process.env.REFRESH_TOKEN_SECRET) {
      throw new AppError('Refresh token secret not configured', 500, false);
    }

    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET) as any;
    
    // Get user data
    const userResult = await db.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    // Generate new access token
    const accessToken = generateAccessToken(user.id, user);

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        expires_in: 86400,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid refresh token', 401);
    }
    throw error;
  }
}));

// Helper functions
function generateAccessToken(userId: string, user: any): string {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT secret not configured', 500, false);
  }

  return jwt.sign(
    { 
      userId,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

function generateRefreshToken(userId: string): string {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new AppError('Refresh token secret not configured', 500, false);
  }

  return jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '30d' }
  );
}

export { router as authRoutes };
