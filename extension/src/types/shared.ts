// Shared types for the extension - copied from shared package to avoid path issues

export interface User {
  id: string;
  email: string;
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  confidence: number;
  started_at: Date;
  last_active_at: Date;
  screenshot_url?: string;
  mode: 'strict' | 'loose';
}

export interface Tab {
  id: string;
  session_id: string;
  url: string;
  title: string;
  pinned: boolean;
  order_index: number;
  first_seen_at: Date;
  last_seen_at: Date;
}

export type EventType = 'open' | 'update' | 'activate' | 'close';

export interface Event {
  id: string;
  user_id: string;
  window_id: number;
  tab_id: number;
  type: EventType;
  title: string;
  url: string;
  ts: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface ExtensionConfig {
  api_base_url: string;
  enable_screenshots: boolean;
  clustering_threshold: number;
  max_sessions_per_user: number;
  session_timeout_minutes: number;
}

// URL utilities
export function redactSensitiveUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    const sensitiveParams = [
      'token', 'access_token', 'auth_token', 'api_key', 'apikey',
      'key', 'secret', 'password', 'pwd', 'pass',
      'session', 'sessionid', 'session_id', 'sid',
      'oauth', 'oauth_token', 'oauth_signature',
      'code', 'auth_code', 'authorization_code',
      'client_secret', 'refresh_token',
      'jwt', 'bearer'
    ];
    
    for (const param of sensitiveParams) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

export function shouldIgnoreUrl(url: string): boolean {
  const ignoredPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'moz-extension://',
    'safari-extension://',
    'data:',
    'javascript:'
  ];
  
  return ignoredPrefixes.some(prefix => url.startsWith(prefix));
}
