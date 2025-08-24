// Request validation middleware
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './error-handler.js';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body);
        if (error) {
          throw new AppError(`Invalid request body: ${error.details[0].message}`, 400);
        }
        req.body = value;
      }

      // Validate query parameters
      if (schema.query) {
        const { error, value } = schema.query.validate(req.query);
        if (error) {
          throw new AppError(`Invalid query parameters: ${error.details[0].message}`, 400);
        }
        req.query = value;
      }

      // Validate route parameters
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params);
        if (error) {
          throw new AppError(`Invalid route parameters: ${error.details[0].message}`, 400);
        }
        req.params = value;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }),

  uuid: Joi.string().uuid().required(),

  email: Joi.string().email().required(),

  password: Joi.string().min(8).max(128).required(),

  url: Joi.string().uri().max(2048).required(),

  timestamp: Joi.date().iso().required(),
};
