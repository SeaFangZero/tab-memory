// Supabase migration utility
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './connection.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSupabaseMigrations() {
  try {
    logger.info('Starting Supabase migrations...');
    
    // Check if we're connected to Supabase
    const isSupabase = process.env.SUPABASE_DB_URL || process.env.SUPABASE_URL;
    if (!isSupabase) {
      logger.warn('SUPABASE_DB_URL not found. Running local PostgreSQL migration instead.');
      // Fall back to local schema
      return runLocalMigration();
    }
    
    // Read and execute supabase-schema.sql
    const schemaPath = path.join(__dirname, 'supabase-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of statements) {
      try {
        await db.query(statement);
        successCount++;
        logger.debug('Executed statement:', statement.substring(0, 50) + '...');
      } catch (error) {
        const errorMsg = (error as Error).message;
        // Some statements might fail if they already exist (like CREATE EXTENSION)
        if (errorMsg.includes('already exists') || 
            errorMsg.includes('duplicate') ||
            errorMsg.includes('does not exist')) {
          skipCount++;
          logger.debug('Skipped existing:', statement.substring(0, 50) + '...');
        } else {
          logger.error('Statement failed:', {
            error: errorMsg,
            statement: statement.substring(0, 100)
          });
          throw error;
        }
      }
    }
    
    logger.info('Supabase migrations completed successfully', {
      executed: successCount,
      skipped: skipCount,
      total: statements.length
    });
    
    // Test the connection
    const healthCheck = await db.healthCheck();
    if (healthCheck) {
      logger.info('Supabase database health check passed');
    } else {
      logger.error('Supabase database health check failed');
      process.exit(1);
    }
    
    // Test basic operations
    await testBasicOperations();
    
  } catch (error) {
    logger.error('Supabase migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

async function runLocalMigration() {
  try {
    // Read and execute local schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      try {
        await db.query(statement);
        logger.debug('Executed local statement:', statement.substring(0, 50) + '...');
      } catch (error) {
        logger.warn('Local statement failed (may be expected):', {
          error: (error as Error).message,
          statement: statement.substring(0, 100)
        });
      }
    }
    
    logger.info('Local PostgreSQL migrations completed');
  } catch (error) {
    logger.error('Local migration failed:', error);
    throw error;
  }
}

async function testBasicOperations() {
  try {
    logger.info('Testing basic database operations...');
    
    // Test user creation (this will fail if RLS is enabled, which is expected)
    try {
      const testUser = await db.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        ['test@tabmemory.com', 'hashed_password_123']
      );
      
      if (testUser.rows.length > 0) {
        logger.info('✅ User creation test passed');
        
        // Clean up test user
        await db.query('DELETE FROM users WHERE email = $1', ['test@tabmemory.com']);
        logger.info('✅ User cleanup completed');
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('policy')) {
        logger.info('ℹ️ RLS policies are active (expected for Supabase)');
      } else {
        logger.warn('User test failed:', errorMsg);
      }
    }
    
    // Test table existence
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const expectedTables = ['users', 'sessions', 'tabs', 'events', 'vectors'];
    const existingTables = tables.rows.map(row => row.table_name);
    
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        logger.info(`✅ Table '${table}' exists`);
      } else {
        logger.error(`❌ Table '${table}' missing`);
      }
    }
    
    // Test extensions
    const extensions = await db.query(`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'vector')
    `);
    
    const installedExtensions = extensions.rows.map(row => row.extname);
    logger.info('Installed extensions:', installedExtensions);
    
    if (installedExtensions.includes('vector')) {
      logger.info('✅ pgvector extension is available');
    } else {
      logger.warn('⚠️ pgvector extension not found (install manually in Supabase)');
    }
    
  } catch (error) {
    logger.error('Basic operations test failed:', error);
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSupabaseMigrations();
}

export { runSupabaseMigrations };
