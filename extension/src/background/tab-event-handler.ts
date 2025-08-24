// Tab event handler - monitors and processes tab events
import { Event, EventType, shouldIgnoreUrl, redactSensitiveUrl } from '../types/shared.js';
import { StorageManager } from './storage-manager.js';
import { ApiClient } from './api-client.js';

export class TabEventHandler {
  constructor(
    private storageManager: StorageManager,
    private apiClient: ApiClient
  ) {}

  setupListeners(): void {
    // Tab creation
    chrome.tabs.onCreated.addListener((tab) => {
      this.handleTabEvent(tab, 'open');
    });

    // Tab updates (URL changes, title changes)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url || changeInfo.title) {
        this.handleTabEvent(tab, 'update');
      }
    });

    // Tab activation (switching between tabs)
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        this.handleTabEvent(tab, 'activate');
      } catch (error) {
        console.error('Tab Memory: Failed to get activated tab:', error);
      }
    });

    // Tab removal
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      this.handleTabClose(tabId, removeInfo.windowId);
    });

    // Window focus changes
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        this.handleWindowFocus(windowId);
      }
    });
  }

  private async handleTabEvent(tab: chrome.tabs.Tab, eventType: EventType): Promise<void> {
    try {
      // Skip if tab doesn't have required properties
      if (!tab.id || !tab.url || !tab.windowId) {
        return;
      }

      // Skip ignored URLs (chrome://, extension pages, etc.)
      if (shouldIgnoreUrl(tab.url)) {
        return;
      }

      // Create event record
      const event: Omit<Event, 'id' | 'user_id'> = {
        window_id: tab.windowId,
        tab_id: tab.id,
        type: eventType,
        title: tab.title || 'Untitled',
        url: redactSensitiveUrl(tab.url),
        ts: new Date()
      };

      // Store event locally
      await this.storageManager.storeEvent(event);

      // Queue for API sync (non-blocking)
      const eventWithLocalId = {
        ...event,
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      this.apiClient.queueEvent(eventWithLocalId).catch(error => {
        console.error('Tab Memory: Failed to queue event for sync:', error);
      });

    } catch (error) {
      console.error('Tab Memory: Failed to handle tab event:', error);
    }
  }

  private async handleTabClose(tabId: number, windowId: number): Promise<void> {
    try {
      // Get tab info from storage if available (tab is already closed)
      const tabInfo = await this.storageManager.getTabInfo(tabId);
      
      const event: Omit<Event, 'id' | 'user_id'> = {
        window_id: windowId,
        tab_id: tabId,
        type: 'close',
        title: tabInfo?.title || 'Closed Tab',
        url: tabInfo?.url || '',
        ts: new Date()
      };

      await this.storageManager.storeEvent(event);
      await this.storageManager.removeTabInfo(tabId);

      const eventWithLocalId = {
        ...event,
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      this.apiClient.queueEvent(eventWithLocalId).catch(error => {
        console.error('Tab Memory: Failed to queue close event for sync:', error);
      });

    } catch (error) {
      console.error('Tab Memory: Failed to handle tab close:', error);
    }
  }

  private async handleWindowFocus(windowId: number): Promise<void> {
    try {
      // Get active tab in the focused window
      const tabs = await chrome.tabs.query({ active: true, windowId });
      if (tabs.length > 0) {
        const tab = tabs[0];
        this.handleTabEvent(tab, 'activate');
      }
    } catch (error) {
      console.error('Tab Memory: Failed to handle window focus:', error);
    }
  }
}
