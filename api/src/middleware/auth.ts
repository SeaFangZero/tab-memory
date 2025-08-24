// Authentication middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error-handler.js';
import { User } from '@shared/types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      throw new AppError('JWT secret not configured', 500, false);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    if (!decoded.userId) {
      throw new AppError('Invalid token payload', 401);
    }

    req.userId = decoded.userId;
    req.user = decoded.user;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid access token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Access token expired', 401));
    } else {
      next(error);
    }
  }
};

export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      return next(); // Continue without authentication if JWT not configured
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    if (decoded.userId) {
      req.userId = decoded.userId;
      req.user = decoded.user;
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};
