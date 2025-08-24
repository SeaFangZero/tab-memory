// API client - handles communication with the Tab Memory API
import { Event, ApiResponse, AuthToken, Session, Tab } from '../types/shared.js';
import { StorageManager } from './storage-manager.js';

export class ApiClient {
  private baseUrl: string = '';
  private authToken: string | null = null;
  private eventQueue: (Omit<Event, 'id' | 'user_id'> & { localId: string })[] = [];
  private syncInProgress = false;

  constructor(private storageManager?: StorageManager) {}

  async initialize(): Promise<void> {
    if (this.storageManager) {
      const config = await this.storageManager.getConfig();
      this.baseUrl = config.api_base_url;
      this.authToken = await this.storageManager.getAuthToken();
    }
  }

  async authenticate(email: string, password: string): Promise<AuthToken> {
    const response = await this.post<AuthToken>('/auth/login', {
      email,
      password
    });

    if (response.success && response.data) {
      this.authToken = response.data.access_token;
      if (this.storageManager) {
        await this.storageManager.setAuthToken(this.authToken);
      }
      return response.data;
    }

    throw new Error(response.error || 'Authentication failed');
  }

  async logout(): Promise<void> {
    if (this.authToken && this.storageManager) {
      await this.storageManager.setAuthToken(null);
    }
    this.authToken = null;
  }

  async queueEvent(event: Omit<Event, 'id' | 'user_id'> & { localId: string }): Promise<void> {
    this.eventQueue.push(event);
    
    // Auto-sync if queue gets large
    if (this.eventQueue.length >= 10) {
      this.syncPendingEvents().catch(error => {
        console.error('Tab Memory: Auto-sync failed:', error);
      });
    }
  }

  async syncPendingEvents(): Promise<void> {
    if (this.syncInProgress || !this.authToken) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Get events from storage and queue
      const storedEvents = this.storageManager 
        ? await this.storageManager.getPendingEvents()
        : [];
      
      const allEvents = [...storedEvents, ...this.eventQueue];
      
      if (allEvents.length === 0) {
        return;
      }

      // Send events in batches
      const batchSize = 50;
      const syncedLocalIds: string[] = [];

      for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        
        try {
          const response = await this.post<{ synced_count: number }>('/events/batch', {
            events: batch.map(({ localId, ...event }) => event)
          });

          if (response.success) {
            syncedLocalIds.push(...batch.map(e => e.localId));
          }
        } catch (error) {
          console.error('Tab Memory: Failed to sync batch:', error);
          break; // Stop syncing on error to avoid data loss
        }
      }

      // Mark synced events as processed
      if (syncedLocalIds.length > 0 && this.storageManager) {
        await this.storageManager.markEventsSynced(syncedLocalIds);
      }

      // Clear synced events from queue
      this.eventQueue = this.eventQueue.filter(
        event => !syncedLocalIds.includes(event.localId)
      );

    } catch (error) {
      console.error('Tab Memory: Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async getSessions(limit = 20, offset = 0): Promise<Session[]> {
    const response = await this.get<{ sessions: Session[] }>('/sessions', {
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (response.success && response.data) {
      return response.data.sessions;
    }

    throw new Error(response.error || 'Failed to fetch sessions');
  }

  async getSessionTabs(sessionId: string): Promise<Tab[]> {
    const response = await this.get<{ tabs: Tab[] }>(`/sessions/${sessionId}/tabs`);

    if (response.success && response.data) {
      return response.data.tabs;
    }

    throw new Error(response.error || 'Failed to fetch session tabs');
  }

  async restoreSession(sessionId: string): Promise<void> {
    const response = await this.post('/sessions/restore', { sessionId });

    if (!response.success) {
      throw new Error(response.error || 'Failed to restore session');
    }
  }

  private async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse<T>(response);
  }

  private async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });

    return this.handleResponse<T>(response);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse response: ${error}`
      };
    }
  }
}
