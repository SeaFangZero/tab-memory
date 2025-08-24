import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Main popup application component
import { useEffect } from 'react';
import { AuthForm } from './AuthForm.js';
import { SessionsList } from './SessionsList.js';
import { useExtensionApi } from '../hooks/useExtensionApi.js';
export const PopupApp = () => {
    const { isAuthenticated, isLoading, error, sessions, login, logout, loadSessions, restoreSession } = useExtensionApi();
    useEffect(() => {
        if (isAuthenticated) {
            loadSessions();
        }
    }, [isAuthenticated, loadSessions]);
    return (_jsxs("div", { className: "popup-container", children: [_jsxs("div", { className: "popup-header", children: [_jsx("h1", { className: "popup-title", children: "Tab Memory" }), _jsx("div", { className: `popup-status ${isAuthenticated ? 'status-connected' : 'status-disconnected'}`, children: isAuthenticated ? 'Connected' : 'Not connected' })] }), _jsxs("div", { className: "popup-content", children: [error && (_jsx("div", { className: "error-message", children: error })), !isAuthenticated ? (_jsx(AuthForm, { onLogin: login, isLoading: isLoading })) : (_jsx(SessionsList, { sessions: sessions, isLoading: isLoading, onRestore: restoreSession, onLogout: logout }))] })] }));
};
