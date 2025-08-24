// Local storage manager - handles Chrome extension storage
import { Event, ExtensionConfig } from '../types/shared.js';

interface TabInfo {
  title: string;
  url: string;
  lastSeen: Date;
}

interface StoredData {
  events: (Omit<Event, 'id' | 'user_id'> & { localId: string })[];
  tabInfo: Record<number, TabInfo>;
  config: ExtensionConfig;
  lastSync: Date | null;
  authToken: string | null;
}

export class StorageManager {
  private readonly STORAGE_KEY = 'tabMemoryData';
  private readonly MAX_LOCAL_EVENTS = 1000; // Limit local storage size

  async initialize(): Promise<void> {
    // Ensure default config exists
    const data = await this.getData();
    if (!data.config) {
      await this.updateConfig({
        api_base_url: 'https://api.tabmemory.com',
        enable_screenshots: false, // Default to privacy-first
        clustering_threshold: 5,
        max_sessions_per_user: 100,
        session_timeout_minutes: 30
      });
    }
  }

  async storeEvent(event: Omit<Event, 'id' | 'user_id'>): Promise<void> {
    const data = await this.getData();
    
    // Add local ID for tracking
    const eventWithId = {
      ...event,
      localId: this.generateLocalId(),
      ts: event.ts instanceof Date ? event.ts : new Date(event.ts)
    };

    data.events.push(eventWithId);

    // Store tab info for future reference
    if (event.tab_id && event.url && event.title) {
      data.tabInfo[event.tab_id] = {
        title: event.title,
        url: event.url,
        lastSeen: eventWithId.ts
      };
    }

    // Cleanup old events to prevent storage bloat
    if (data.events.length > this.MAX_LOCAL_EVENTS) {
      data.events = data.events.slice(-this.MAX_LOCAL_EVENTS);
    }

    await this.setData(data);
  }

  async getTabInfo(tabId: number): Promise<TabInfo | null> {
    const data = await this.getData();
    return data.tabInfo[tabId] || null;
  }

  async removeTabInfo(tabId: number): Promise<void> {
    const data = await this.getData();
    delete data.tabInfo[tabId];
    await this.setData(data);
  }

  async getPendingEvents(): Promise<(Omit<Event, 'id' | 'user_id'> & { localId: string })[]> {
    const data = await this.getData();
    return data.events;
  }

  async markEventsSynced(localIds: string[]): Promise<void> {
    const data = await this.getData();
    data.events = data.events.filter(event => !localIds.includes(event.localId));
    data.lastSync = new Date();
    await this.setData(data);
  }

  async getConfig(): Promise<ExtensionConfig> {
    const data = await this.getData();
    return data.config;
  }

  async updateConfig(config: Partial<ExtensionConfig>): Promise<void> {
    const data = await this.getData();
    data.config = { ...data.config, ...config };
    await this.setData(data);
  }

  async getAuthToken(): Promise<string | null> {
    const data = await this.getData();
    return data.authToken;
  }

  async setAuthToken(token: string | null): Promise<void> {
    const data = await this.getData();
    data.authToken = token;
    await this.setData(data);
  }

  async getLastSync(): Promise<Date | null> {
    const data = await this.getData();
    return data.lastSync;
  }

  async clearAllData(): Promise<void> {
    await chrome.storage.local.remove(this.STORAGE_KEY);
  }

  private async getData(): Promise<StoredData> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const data = result[this.STORAGE_KEY];
      
      if (!data) {
        return this.getDefaultData();
      }

      // Ensure all required fields exist
      return {
        events: data.events || [],
        tabInfo: data.tabInfo || {},
        config: data.config || this.getDefaultConfig(),
        lastSync: data.lastSync ? new Date(data.lastSync) : null,
        authToken: data.authToken || null
      };
    } catch (error) {
      console.error('Tab Memory: Failed to get data from storage:', error);
      return this.getDefaultData();
    }
  }

  private async setData(data: StoredData): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: {
          ...data,
          lastSync: data.lastSync?.toISOString() || null
        }
      });
    } catch (error) {
      console.error('Tab Memory: Failed to set data in storage:', error);
      throw error;
    }
  }

  private getDefaultData(): StoredData {
    return {
      events: [],
      tabInfo: {},
      config: this.getDefaultConfig(),
      lastSync: null,
      authToken: null
    };
  }

  private getDefaultConfig(): ExtensionConfig {
    return {
      api_base_url: 'https://api.tabmemory.com',
      enable_screenshots: false,
      clustering_threshold: 5,
      max_sessions_per_user: 100,
      session_timeout_minutes: 30
    };
  }

  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
