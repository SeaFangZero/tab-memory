import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export const SessionsList = ({ sessions, isLoading, onRestore, onLogout }) => {
    const handleRestore = async (sessionId) => {
        try {
            await onRestore(sessionId);
            // Close popup after successful restore
            window.close();
        }
        catch (error) {
            console.error('Failed to restore session:', error);
        }
    };
    if (isLoading && sessions.length === 0) {
        return (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "loading-spinner", style: { marginBottom: '12px' } }), _jsx("p", { children: "Loading your sessions..." })] }));
    }
    if (sessions.length === 0) {
        return (_jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: "No sessions yet" }), _jsx("p", { children: "Start browsing and Tab Memory will automatically organize your tabs into sessions. Come back here to restore your past work!" }), _jsx("button", { onClick: onLogout, className: "btn btn-secondary", style: { marginTop: '20px' }, children: "Sign Out" })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sessions-list", children: sessions.map((session) => (_jsx(SessionCard, { session: session, onRestore: () => handleRestore(session.id) }, session.id))) }), _jsx("div", { style: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e5e5' }, children: _jsx("button", { onClick: onLogout, className: "btn btn-secondary", style: { width: '100%' }, children: "Sign Out" }) })] }));
};
const SessionCard = ({ session, onRestore }) => {
    const formatDate = (date) => {
        const now = new Date();
        const sessionDate = new Date(date);
        const diffMs = now.getTime() - sessionDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        if (diffHours < 1) {
            return 'Just now';
        }
        else if (diffHours < 24) {
            return `${diffHours}h ago`;
        }
        else if (diffDays < 7) {
            return `${diffDays}d ago`;
        }
        else {
            return sessionDate.toLocaleDateString();
        }
    };
    const getTabCount = () => {
        // This would be populated from API in real implementation
        // For now, showing placeholder
        return Math.floor(Math.random() * 10) + 3; // 3-12 tabs
    };
    return (_jsxs("div", { className: "session-card", onClick: onRestore, children: [_jsx("h3", { className: "session-title", children: session.title }), session.summary && (_jsx("p", { className: "session-summary", children: session.summary })), _jsxs("div", { className: "session-meta", children: [_jsxs("span", { className: "session-tabs", children: [getTabCount(), " tabs"] }), _jsx("span", { children: formatDate(session.last_active_at) })] })] }));
};
