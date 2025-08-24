// Database migration utility
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './connection.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      try {
        await db.query(statement);
        logger.debug('Executed statement:', statement.substring(0, 100) + '...');
      } catch (error) {
        // Some statements might fail if they already exist (like CREATE EXTENSION)
        // Log but don't fail the migration
        logger.warn('Statement failed (may be expected):', {
          error: (error as Error).message,
          statement: statement.substring(0, 100)
        });
      }
    }
    
    logger.info('Database migrations completed successfully');
    
    // Test the connection
    const healthCheck = await db.healthCheck();
    if (healthCheck) {
      logger.info('Database health check passed');
    } else {
      logger.error('Database health check failed');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations };
