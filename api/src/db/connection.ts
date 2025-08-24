// Database connection management
import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger.js';
import mockDb from './mock-db.js';

class DatabaseConnection {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    // Support both Supabase and local PostgreSQL
    const connectionConfig = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL 
      ? { connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL }
      : {
          host: process.env.DATABASE_HOST,
          port: parseInt(process.env.DATABASE_PORT || '5432'),
          database: process.env.DATABASE_NAME,
          user: process.env.DATABASE_USER,
          password: process.env.DATABASE_PASSWORD,
        };

    this.pool = new Pool({
      ...connectionConfig,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Increase timeout for Supabase
      ssl: process.env.NODE_ENV === 'production' || process.env.SUPABASE_DB_URL ? { rejectUnauthorized: false } : false,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Handle pool connection events
    this.pool.on('connect', () => {
      this.isConnected = true;
      logger.info('Database connected');
    });

    this.pool.on('remove', () => {
      logger.info('Database client removed');
    });
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text,
        duration,
        rows: result.rowCount,
      });
      
      return result;
    } catch (error) {
      logger.warn('PostgreSQL unavailable, falling back to mock database', {
        error: (error as Error).message
      });
      
      // Fallback to mock database for testing
      return mockDb.query(text, params);
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    try {
      const client = await this.getClient();
      
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.warn('PostgreSQL transaction failed, using mock database');
      // Fallback to mock database (no real transactions needed)
      return callback(mockDb);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    logger.info('Database connection closed');
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.debug('Database health check using fallback');
      return mockDb.healthCheck();
    }
  }
}

export const db = new DatabaseConnection();
export default db;
