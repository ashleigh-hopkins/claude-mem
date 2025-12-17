/**
 * Pivot Indicator Component
 *
 * Visual marker showing conversation phase transitions
 */

import React from 'react';
import { Pivot } from '../utils/pivots';

interface PivotIndicatorProps {
  pivot: Pivot;
}

export function PivotIndicator({ pivot }: PivotIndicatorProps) {
  const getStyles = () => {
    switch (pivot.type) {
      case 'phase_change':
        return {
          backgroundColor: 'rgba(56, 139, 253, 0.1)',
          borderColor: 'rgba(56, 139, 253, 0.3)',
          color: '#388bfd'
        };
      case 'decision_point':
        return {
          backgroundColor: 'rgba(248, 81, 73, 0.1)',
          borderColor: 'rgba(248, 81, 73, 0.3)',
          color: '#f85149'
        };
      case 'new_question':
        return {
          backgroundColor: 'rgba(163, 113, 247, 0.1)',
          borderColor: 'rgba(163, 113, 247, 0.3)',
          color: '#a371f7'
        };
      case 'file_change':
        return {
          backgroundColor: 'rgba(136, 192, 208, 0.1)',
          borderColor: 'rgba(136, 192, 208, 0.3)',
          color: '#88c0d0'
        };
      default:
        return {
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className="pivot-indicator"
      style={{
        margin: '20px 20px',
        padding: '12px 16px',
        backgroundColor: styles.backgroundColor,
        border: `1px dashed ${styles.borderColor}`,
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        fontSize: '13px',
        fontWeight: 500,
        color: styles.color
      }}
    >
      <span style={{ fontSize: '16px', marginRight: '10px' }}>{pivot.icon}</span>
      <span style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', marginRight: '10px' }}>
        {pivot.type.replace('_', ' ')}
      </span>
      <span style={{ opacity: 0.9 }}>{pivot.label}</span>
    </div>
  );
}
