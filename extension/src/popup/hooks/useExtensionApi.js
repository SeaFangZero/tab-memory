// Hook for managing extension API interactions
import { useState, useCallback, useEffect } from 'react';
export const useExtensionApi = () => {
    const [state, setState] = useState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessions: []
    });
    // Check authentication status on mount
    useEffect(() => {
        checkAuthStatus();
    }, []);
    const checkAuthStatus = useCallback(async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'CHECK_AUTH_STATUS'
            });
            setState(prev => ({
                ...prev,
                isAuthenticated: response.authenticated
            }));
        }
        catch (error) {
            console.error('Failed to check auth status:', error);
        }
    }, []);
    const login = useCallback(async (email, password) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'LOGIN',
                payload: { email, password }
            });
            if (response.success) {
                setState(prev => ({
                    ...prev,
                    isAuthenticated: true,
                    isLoading: false
                }));
            }
            else {
                setState(prev => ({
                    ...prev,
                    error: response.error || 'Login failed',
                    isLoading: false
                }));
            }
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: 'Network error. Please try again.',
                isLoading: false
            }));
        }
    }, []);
    const logout = useCallback(async () => {
        try {
            await chrome.runtime.sendMessage({
                type: 'LOGOUT'
            });
            setState(prev => ({
                ...prev,
                isAuthenticated: false,
                sessions: []
            }));
        }
        catch (error) {
            console.error('Failed to logout:', error);
        }
    }, []);
    const loadSessions = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_SESSIONS',
                payload: { limit: 20, offset: 0 }
            });
            if (response.success) {
                setState(prev => ({
                    ...prev,
                    sessions: response.sessions || [],
                    isLoading: false
                }));
            }
            else {
                setState(prev => ({
                    ...prev,
                    error: response.error || 'Failed to load sessions',
                    isLoading: false
                }));
            }
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: 'Failed to load sessions',
                isLoading: false
            }));
        }
    }, []);
    const restoreSession = useCallback(async (sessionId) => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'RESTORE_SESSION',
                payload: { sessionId }
            });
            if (!response.success) {
                setState(prev => ({
                    ...prev,
                    error: response.error || 'Failed to restore session'
                }));
            }
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: 'Failed to restore session'
            }));
        }
    }, []);
    return {
        ...state,
        login,
        logout,
        loadSessions,
        restoreSession
    };
};
