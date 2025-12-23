/**
 * Prompt Group Component
 *
 * Groups observations by prompt number with collapsible sections
 */

import React, { useState } from 'react';
import { Observation } from '../types';
import { ObservationCard } from './ObservationCard';

interface PromptGroupProps {
  promptNumber: number;
  promptText: string | null;
  observations: Observation[];
  isExpanded?: boolean;
}

export function PromptGroup({
  promptNumber,
  promptText,
  observations,
  isExpanded = true
}: PromptGroupProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  // Count observations by type
  const typeCounts = observations.reduce((acc, obs) => {
    acc[obs.type] = (acc[obs.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Type icons
  const typeIcons: Record<string, string> = {
    discovery: '🔍',
    feature: '✨',
    bugfix: '🐛',
    change: '✏️',
    refactor: '🔄',
    decision: '🔴'
  };

  // Format type counts for display
  const typeCountsDisplay = Object.entries(typeCounts)
    .map(([type, count]) => `${typeIcons[type] || '•'} ${count}`)
    .join('  ');

  return (
    <div className="prompt-group" style={{ marginBottom: '24px' }}>
      {/* Group Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: expanded ? '12px' : '0',
          userSelect: 'none'
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px', marginRight: '8px', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              Prompt {promptNumber}
            </strong>
            {promptText && (
              <span style={{ marginLeft: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                "{promptText.length > 100 ? promptText.substring(0, 100) + '...' : promptText}"
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '26px' }}>
            {observations.length} observations • {typeCountsDisplay}
          </div>
        </div>
      </div>

      {/* Observations */}
      {expanded && (
        <div style={{ paddingLeft: '20px' }}>
          {observations.map((obs) => (
            <ObservationCard key={obs.id} observation={obs} />
          ))}
        </div>
      )}
    </div>
  );
}
