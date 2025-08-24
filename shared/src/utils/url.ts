// URL utilities for privacy and security

/**
 * Redact sensitive query parameters from URLs for storage
 * Removes tokens, API keys, and other potentially sensitive data
 */
export function redactSensitiveUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // List of query parameter names that should be redacted
    const sensitiveParams = [
      'token', 'access_token', 'auth_token', 'api_key', 'apikey',
      'key', 'secret', 'password', 'pwd', 'pass',
      'session', 'sessionid', 'session_id', 'sid',
      'oauth', 'oauth_token', 'oauth_signature',
      'code', 'auth_code', 'authorization_code',
      'client_secret', 'refresh_token',
      'jwt', 'bearer'
    ];
    
    // Check each query parameter
    for (const param of sensitiveParams) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    }
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original URL
    // This handles edge cases like chrome:// URLs
    return url;
  }
}

/**
 * Extract domain from URL for categorization
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if URL is a utility tab that should be excluded from clustering
 */
export function isUtilityTab(url: string, title: string): boolean {
  const utilityDomains = [
    'gmail.com',
    'mail.google.com',
    'outlook.com',
    'outlook.live.com',
    'web.whatsapp.com',
    'spotify.com',
    'music.youtube.com',
    'calendar.google.com',
    'keep.google.com',
    'notion.so',
    'slack.com',
    'discord.com',
    'teams.microsoft.com'
  ];
  
  const domain = extractDomain(url);
  if (!domain) return false;
  
  return utilityDomains.some(utilDomain => 
    domain === utilDomain || domain.endsWith('.' + utilDomain)
  );
}

/**
 * Check if URL should be ignored entirely (browser internal pages, etc.)
 */
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

/**
 * Normalize URL for comparison (remove fragments, sort query params, etc.)
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove fragment
    urlObj.hash = '';
    
    // Sort query parameters for consistent comparison
    const sortedParams = new URLSearchParams();
    const paramKeys = Array.from(urlObj.searchParams.keys()).sort();
    
    for (const key of paramKeys) {
      const values = urlObj.searchParams.getAll(key);
      for (const value of values) {
        sortedParams.append(key, value);
      }
    }
    
    urlObj.search = sortedParams.toString();
    
    return urlObj.toString();
  } catch {
    return url;
  }
}
