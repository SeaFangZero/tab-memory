// Sessions list component
import React from 'react';
import { Session } from '../../types/shared.js';

interface SessionsListProps {
  sessions: Session[];
  isLoading: boolean;
  onRestore: (sessionId: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export const SessionsList: React.FC<SessionsListProps> = ({
  sessions,
  isLoading,
  onRestore,
  onLogout
}) => {
  const handleRestore = async (sessionId: string) => {
    try {
      await onRestore(sessionId);
      // Close popup after successful restore
      window.close();
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  };

  if (isLoading && sessions.length === 0) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" style={{ marginBottom: '12px' }} />
        <p>Loading your sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <h3>No sessions yet</h3>
        <p>
          Start browsing and Tab Memory will automatically organize your tabs into sessions.
          Come back here to restore your past work!
        </p>
        <button
          onClick={onLogout}
          className="btn btn-secondary"
          style={{ marginTop: '20px' }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="sessions-list">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onRestore={() => handleRestore(session.id)}
          />
        ))}
      </div>

      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e5e5' }}>
        <button
          onClick={onLogout}
          className="btn btn-secondary"
          style={{ width: '100%' }}
        >
          Sign Out
        </button>
      </div>
    </>
  );
};

interface SessionCardProps {
  session: Session;
  onRestore: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onRestore }) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffMs = now.getTime() - sessionDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return sessionDate.toLocaleDateString();
    }
  };

  const getTabCount = () => {
    // This would be populated from API in real implementation
    // For now, showing placeholder
    return Math.floor(Math.random() * 10) + 3; // 3-12 tabs
  };

  return (
    <div className="session-card" onClick={onRestore}>
      <h3 className="session-title">{session.title}</h3>
      {session.summary && (
        <p className="session-summary">{session.summary}</p>
      )}
      <div className="session-meta">
        <span className="session-tabs">{getTabCount()} tabs</span>
        <span>{formatDate(session.last_active_at)}</span>
      </div>
    </div>
  );
};
