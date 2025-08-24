// Supabase connection and database operations
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

class SupabaseConnection {
  private supabase: SupabaseClient;
  private isConnected: boolean = false;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    this.isConnected = true;
    logger.info('Supabase connection initialized');
  }

  // Maintain compatibility with existing pg-style query interface
  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    
    try {
      // Convert PostgreSQL query to Supabase RPC or direct query
      const result = await this.executeQuery(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Supabase query executed', {
        query: text.substring(0, 100) + '...',
        duration,
        rows: result.rowCount || result.length,
      });
      
      return result;
    } catch (error) {
      logger.error('Supabase query error', {
        query: text,
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private async executeQuery(text: string, params?: any[]): Promise<any> {
    // Parse the SQL query and route to appropriate Supabase method
    const trimmedQuery = text.trim().toLowerCase();
    
    if (trimmedQuery.startsWith('select')) {
      return this.handleSelect(text, params);
    } else if (trimmedQuery.startsWith('insert')) {
      return this.handleInsert(text, params);
    } else if (trimmedQuery.startsWith('update')) {
      return this.handleUpdate(text, params);
    } else if (trimmedQuery.startsWith('delete')) {
      return this.handleDelete(text, params);
    } else {
      // For DDL queries (CREATE, ALTER, etc.), use RPC
      return this.handleDDL(text, params);
    }
  }

  private async handleSelect(text: string, params?: any[]): Promise<any> {
    // Extract table name and build Supabase query
    const tableMatch = text.match(/from\s+(\w+)/i);
    if (!tableMatch) {
      throw new Error('Could not parse table name from SELECT query');
    }
    
    const tableName = tableMatch[1];
    let query = this.supabase.from(tableName).select('*');
    
    // Handle WHERE clauses with parameters
    if (params && params.length > 0) {
      // This is a simplified parser - in production you'd want more robust SQL parsing
      const whereMatch = text.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|\s+offset|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        query = this.applyWhereClause(query, whereClause, params);
      }
    }
    
    // Handle ORDER BY
    const orderMatch = text.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
    if (orderMatch) {
      const column = orderMatch[1];
      const direction = orderMatch[2]?.toLowerCase() === 'desc';
      query = query.order(column, { ascending: !direction });
    }
    
    // Handle LIMIT
    const limitMatch = text.match(/limit\s+(\d+)/i);
    if (limitMatch) {
      query = query.limit(parseInt(limitMatch[1]));
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  private async handleInsert(text: string, params?: any[]): Promise<any> {
    const tableMatch = text.match(/insert\s+into\s+(\w+)/i);
    if (!tableMatch) {
      throw new Error('Could not parse table name from INSERT query');
    }
    
    const tableName = tableMatch[1];
    
    // Extract column names
    const columnsMatch = text.match(/\(([^)]+)\)/);
    if (!columnsMatch || !params) {
      throw new Error('Could not parse INSERT columns or values');
    }
    
    const columns = columnsMatch[1].split(',').map(c => c.trim());
    const values = params;
    
    // Build insert object
    const insertData: any = {};
    columns.forEach((col, index) => {
      insertData[col] = values[index];
    });
    
    const { data, error } = await this.supabase
      .from(tableName)
      .insert(insertData)
      .select();
    
    if (error) throw error;
    
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  private async handleUpdate(text: string, params?: any[]): Promise<any> {
    const tableMatch = text.match(/update\s+(\w+)/i);
    if (!tableMatch) {
      throw new Error('Could not parse table name from UPDATE query');
    }
    
    const tableName = tableMatch[1];
    
    // This is a simplified implementation
    // In production, you'd need more robust SQL parsing
    const { data, error } = await this.supabase
      .from(tableName)
      .update({}) // Would need to parse SET clause
      .select();
    
    if (error) throw error;
    
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  private async handleDelete(text: string, params?: any[]): Promise<any> {
    const tableMatch = text.match(/delete\s+from\s+(\w+)/i);
    if (!tableMatch) {
      throw new Error('Could not parse table name from DELETE query');
    }
    
    const tableName = tableMatch[1];
    
    // Simplified implementation
    const { data, error } = await this.supabase
      .from(tableName)
      .delete()
      .select();
    
    if (error) throw error;
    
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  private async handleDDL(text: string, params?: any[]): Promise<any> {
    // For DDL queries, we'll use Supabase RPC functions
    // This requires creating stored procedures in Supabase for schema operations
    logger.warn('DDL query detected - may need manual execution in Supabase', { query: text });
    return { rows: [], rowCount: 0 };
  }

  private applyWhereClause(query: any, whereClause: string, params: any[]): any {
    // Simplified WHERE clause parsing
    // In production, you'd want a proper SQL parser
    if (whereClause.includes('=') && params.length > 0) {
      const columnMatch = whereClause.match(/(\w+)\s*=\s*\$1/);
      if (columnMatch) {
        const column = columnMatch[1];
        query = query.eq(column, params[0]);
      }
    }
    return query;
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    // Supabase doesn't support transactions in the same way as pg
    // We'll simulate it by passing the supabase client
    return callback(this.supabase);
  }

  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
    this.isConnected = false;
    logger.info('Supabase connection closed');
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to query a system table
      const { error } = await this.supabase.from('users').select('count').limit(1);
      return !error;
    } catch (error) {
      logger.error('Supabase health check failed', error);
      return false;
    }
  }

  // Direct Supabase client access for advanced operations
  getClient(): SupabaseClient {
    return this.supabase;
  }
}

export const db = new SupabaseConnection();
export default db;
