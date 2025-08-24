// Shared types for the extension - copied from shared package to avoid path issues
// URL utilities
export function redactSensitiveUrl(url) {
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
    }
    catch {
        return url;
    }
}
export function shouldIgnoreUrl(url) {
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
