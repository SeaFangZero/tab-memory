// Background script - main entry point for tab monitoring and event handling
import { TabEventHandler } from './tab-event-handler.js';
import { StorageManager } from './storage-manager.js';
import { ApiClient } from './api-client.js';

class TabMemoryBackground {
  public tabEventHandler: TabEventHandler;
  public storageManager: StorageManager;
  public apiClient: ApiClient;

  constructor() {
    this.storageManager = new StorageManager();
    this.apiClient = new ApiClient();
    this.tabEventHandler = new TabEventHandler(this.storageManager, this.apiClient);
  }

  async initialize(): Promise<void> {
    console.log('Tab Memory: Initializing background script');
    
    // Initialize storage and API client
    await this.storageManager.initialize();
    await this.apiClient.initialize();
    
    // Set up tab event listeners
    this.tabEventHandler.setupListeners();
    
    // Set up periodic sync (every 5 minutes)
    this.setupPeriodicSync();
    
    console.log('Tab Memory: Background script initialized');
  }

  private setupPeriodicSync(): void {
    // Sync data with API periodically
    setInterval(async () => {
      try {
        await this.apiClient.syncPendingEvents();
      } catch (error) {
        console.error('Tab Memory: Periodic sync failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
}

// Initialize the background script
const tabMemory = new TabMemoryBackground();
tabMemory.initialize().catch(error => {
  console.error('Tab Memory: Failed to initialize background script:', error);
});

// Handle extension lifecycle events
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Tab Memory: Extension installed/updated', details);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Tab Memory: Browser startup detected');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async responses
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  try {
    switch (message.type) {
      case 'CHECK_AUTH_STATUS':
        const authToken = await tabMemory.storageManager.getAuthToken();
        sendResponse({ authenticated: !!authToken });
        break;

      case 'LOGIN':
        try {
          await tabMemory.apiClient.authenticate(message.payload.email, message.payload.password);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
        break;

      case 'LOGOUT':
        await tabMemory.apiClient.logout();
        sendResponse({ success: true });
        break;

      case 'GET_SESSIONS':
        try {
          const sessions = await tabMemory.apiClient.getSessions(
            message.payload.limit,
            message.payload.offset
          );
          sendResponse({ success: true, sessions });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
        break;

      case 'RESTORE_SESSION':
        try {
          await tabMemory.apiClient.restoreSession(message.payload.sessionId);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Tab Memory: Message handler error:', error);
    sendResponse({ success: false, error: 'Internal error' });
  }
}
