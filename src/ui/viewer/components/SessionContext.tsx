/**
 * Session Context Component
 *
 * Displays high-level session context when a session is filtered
 */

import React from 'react';
import { SessionSummary } from '../hooks/useSessions';

interface SessionContextProps {
  session: SessionSummary;
  observationCount: number;
  onClear: () => void;
}

export function SessionContext({ session, observationCount, onClear }: SessionContextProps) {
  const formatDate = (epoch: number) => {
    return new Date(epoch).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="session-context"
      style={{
        margin: '16px 20px',
        padding: '16px 20px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        position: 'relative'
      }}
    >
      {/* Close button */}
      <button
        onClick={onClear}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px 8px',
          lineHeight: '1'
        }}
        title="Clear session filter"
      >
        ×
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px', marginRight: '8px' }}>🎯</span>
        <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
          Session Context
        </h3>
        <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {formatDate(session.created_at_epoch)}
        </span>
      </div>

      {/* Request */}
      {session.request && (
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Request:</strong>
          <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {session.request}
          </span>
        </div>
      )}

      {/* Learned */}
      {session.learned && (
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Learned:</strong>
          <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {session.learned}
          </span>
        </div>
      )}

      {/* Completed */}
      {session.completed && (
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Completed:</strong>
          <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {session.completed}
          </span>
        </div>
      )}

      {/* Next Steps */}
      {session.next_steps && (
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Next Steps:</strong>
          <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {session.next_steps}
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <span style={{ marginRight: '16px' }}>
          📝 {observationCount} observations in this session
        </span>
        <span>
          📁 Project: <strong>{session.project}</strong>
        </span>
      </div>
    </div>
  );
}
