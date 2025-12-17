/**
 * Search Bar Component
 *
 * Search input with real-time filtering
 */

import React, { useState, useEffect } from 'react';

interface SearchBarProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search observations...' }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value || '');

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(inputValue.trim() || null);
    }, 300);

    return () => clearTimeout(timeout);
  }, [inputValue, onChange]);

  const handleClear = () => {
    setInputValue('');
    onChange(null);
  };

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: '500px', marginLeft: '16px' }}>
      <span
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '16px',
          color: 'var(--text-secondary)',
          pointerEvents: 'none'
        }}
      >
        🔍
      </span>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 36px 8px 36px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: '14px',
          outline: 'none',
          transition: 'border-color 0.2s'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#388bfd';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
        }}
      />
      {inputValue && (
        <button
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
            lineHeight: '1'
          }}
          title="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
