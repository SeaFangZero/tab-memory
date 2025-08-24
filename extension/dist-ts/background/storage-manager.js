export class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'tabMemoryData';
        this.MAX_LOCAL_EVENTS = 1000; // Limit local storage size
    }
    async initialize() {
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
    async storeEvent(event) {
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
    async getTabInfo(tabId) {
        const data = await this.getData();
        return data.tabInfo[tabId] || null;
    }
    async removeTabInfo(tabId) {
        const data = await this.getData();
        delete data.tabInfo[tabId];
        await this.setData(data);
    }
    async getPendingEvents() {
        const data = await this.getData();
        return data.events;
    }
    async markEventsSynced(localIds) {
        const data = await this.getData();
        data.events = data.events.filter(event => !localIds.includes(event.localId));
        data.lastSync = new Date();
        await this.setData(data);
    }
    async getConfig() {
        const data = await this.getData();
        return data.config;
    }
    async updateConfig(config) {
        const data = await this.getData();
        data.config = { ...data.config, ...config };
        await this.setData(data);
    }
    async getAuthToken() {
        const data = await this.getData();
        return data.authToken;
    }
    async setAuthToken(token) {
        const data = await this.getData();
        data.authToken = token;
        await this.setData(data);
    }
    async getLastSync() {
        const data = await this.getData();
        return data.lastSync;
    }
    async clearAllData() {
        await chrome.storage.local.remove(this.STORAGE_KEY);
    }
    async getData() {
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
        }
        catch (error) {
            console.error('Tab Memory: Failed to get data from storage:', error);
            return this.getDefaultData();
        }
    }
    async setData(data) {
        try {
            await chrome.storage.local.set({
                [this.STORAGE_KEY]: {
                    ...data,
                    lastSync: data.lastSync?.toISOString() || null
                }
            });
        }
        catch (error) {
            console.error('Tab Memory: Failed to set data in storage:', error);
            throw error;
        }
    }
    getDefaultData() {
        return {
            events: [],
            tabInfo: {},
            config: this.getDefaultConfig(),
            lastSync: null,
            authToken: null
        };
    }
    getDefaultConfig() {
        return {
            api_base_url: 'https://api.tabmemory.com',
            enable_screenshots: false,
            clustering_threshold: 5,
            max_sessions_per_user: 100,
            session_timeout_minutes: 30
        };
    }
    generateLocalId() {
        return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
