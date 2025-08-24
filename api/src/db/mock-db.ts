// Mock database for testing without PostgreSQL
import { logger } from '../utils/logger.js';

interface MockUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

interface MockSession {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  confidence: number;
  started_at: Date;
  last_active_at: Date;
  screenshot_url: string | null;
  mode: 'strict' | 'loose';
  created_at: Date;
}

interface MockEvent {
  id: string;
  user_id: string;
  window_id: number;
  tab_id: number;
  type: 'open' | 'update' | 'activate' | 'close';
  title: string;
  url: string;
  ts: Date;
  created_at: Date;
}

class MockDatabase {
  private users: MockUser[] = [];
  private sessions: MockSession[] = [];
  private events: MockEvent[] = [];
  private isConnected: boolean = true;

  constructor() {
    logger.info('Mock database initialized for testing');
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    
    try {
      const result = await this.executeQuery(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Mock query executed', {
        query: text.substring(0, 100) + '...',
        duration,
        rows: result.rowCount || result.rows?.length || 0,
      });
      
      return result;
    } catch (error) {
      logger.error('Mock query error', {
        query: text,
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private async executeQuery(text: string, params?: any[]): Promise<any> {
    const trimmedQuery = text.trim().toLowerCase();
    
    if (trimmedQuery.includes('insert into users')) {
      return this.insertUser(params);
    } else if (trimmedQuery.includes('select * from users where email')) {
      return this.findUserByEmail(params);
    } else if (trimmedQuery.includes('insert into events')) {
      return this.insertEvent(params);
    } else if (trimmedQuery.includes('select count(*) from events')) {
      return this.countEvents(params);
    } else if (trimmedQuery.includes('select * from sessions')) {
      return this.getSessions(params);
    } else if (trimmedQuery.includes('select * from users where id')) {
      return this.findUserById(params);
    } else {
      // For unhandled queries, return empty result
      logger.debug('Unhandled query, returning empty result', { query: text });
      return { rows: [], rowCount: 0 };
    }
  }

  private insertUser(params?: any[]): any {
    if (!params || params.length < 2) {
      throw new Error('Missing user parameters');
    }

    const id = this.generateUUID();
    const user: MockUser = {
      id,
      email: params[0],
      password_hash: params[1],
      created_at: new Date()
    };

    // Check if user already exists
    const existing = this.users.find(u => u.email === user.email);
    if (existing) {
      throw new Error('User already exists');
    }

    this.users.push(user);
    
    return {
      rows: [{
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }],
      rowCount: 1
    };
  }

  private findUserByEmail(params?: any[]): any {
    if (!params || params.length < 1) {
      return { rows: [], rowCount: 0 };
    }

    const user = this.users.find(u => u.email === params[0]);
    if (!user) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [user],
      rowCount: 1
    };
  }

  private findUserById(params?: any[]): any {
    if (!params || params.length < 1) {
      return { rows: [], rowCount: 0 };
    }

    const user = this.users.find(u => u.id === params[0]);
    if (!user) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [{
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }],
      rowCount: 1
    };
  }

  private insertEvent(params?: any[]): any {
    if (!params || params.length < 6) {
      throw new Error('Missing event parameters');
    }

    const event: MockEvent = {
      id: this.generateUUID(),
      user_id: params[0],
      window_id: params[1],
      tab_id: params[2],
      type: params[3] as any,
      title: params[4],
      url: params[5],
      ts: new Date(params[6] || new Date()),
      created_at: new Date()
    };

    this.events.push(event);
    
    return {
      rows: [event],
      rowCount: 1
    };
  }

  private countEvents(params?: any[]): any {
    const userEvents = params && params.length > 0 
      ? this.events.filter(e => e.user_id === params[0])
      : this.events;
    
    return {
      rows: [{ count: userEvents.length }],
      rowCount: 1
    };
  }

  private getSessions(params?: any[]): any {
    const userSessions = params && params.length > 0 
      ? this.sessions.filter(s => s.user_id === params[0])
      : this.sessions;
    
    return {
      rows: userSessions,
      rowCount: userSessions.length
    };
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    // Mock transactions - just execute the callback
    return callback(this);
  }

  async close(): Promise<void> {
    this.isConnected = false;
    logger.info('Mock database connection closed');
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async healthCheck(): Promise<boolean> {
    return this.isConnected;
  }
}

export const mockDb = new MockDatabase();
export default mockDb;
