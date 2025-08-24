// Main popup application component
import React, { useState, useEffect } from 'react';
import { Session } from '../../types/shared.js';
import { AuthForm } from './AuthForm.js';
import { SessionsList } from './SessionsList.js';
import { useExtensionApi } from '../hooks/useExtensionApi.js';

export const PopupApp: React.FC = () => {
  const {
    isAuthenticated,
    isLoading,
    error,
    sessions,
    login,
    logout,
    loadSessions,
    restoreSession
  } = useExtensionApi();

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated, loadSessions]);

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h1 className="popup-title">Tab Memory</h1>
        <div className={`popup-status ${isAuthenticated ? 'status-connected' : 'status-disconnected'}`}>
          {isAuthenticated ? 'Connected' : 'Not connected'}
        </div>
      </div>

      <div className="popup-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!isAuthenticated ? (
          <AuthForm
            onLogin={login}
            isLoading={isLoading}
          />
        ) : (
          <SessionsList
            sessions={sessions}
            isLoading={isLoading}
            onRestore={restoreSession}
            onLogout={logout}
          />
        )}
      </div>
    </div>
  );
};
