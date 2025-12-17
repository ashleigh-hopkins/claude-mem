/**
 * Session Selector Component
 *
 * Dropdown to select a specific session for filtering observations
 */

import React from 'react';
import { SessionSummary } from '../hooks/useSessions';

interface SessionSelectorProps {
  sessions: SessionSummary[];
  selectedSession: string | null;
  onSessionChange: (sessionId: string | null) => void;
  isLoading: boolean;
}

export function SessionSelector({
  sessions,
  selectedSession,
  onSessionChange,
  isLoading
}: SessionSelectorProps) {
  const formatDate = (epoch: number) => {
    return new Date(epoch).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const truncate = (text: string | null, maxLength: number) => {
    if (!text) return 'Untitled session';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="session-selector" style={{ marginLeft: '12px' }}>
      <select
        value={selectedSession || ''}
        onChange={(e) => onSessionChange(e.target.value || null)}
        disabled={isLoading}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: '14px',
          cursor: isLoading ? 'wait' : 'pointer',
          minWidth: '200px',
          maxWidth: '400px'
        }}
      >
        <option value="">All Sessions</option>
        {sessions.map((session) => (
          <option key={session.sdk_session_id} value={session.sdk_session_id}>
            {formatDate(session.created_at_epoch)} - {truncate(session.request, 50)}
          </option>
        ))}
      </select>
      {isLoading && (
        <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          Loading sessions...
        </span>
      )}
    </div>
  );
}
