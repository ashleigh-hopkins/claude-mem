/**
 * Enhanced Feed Component
 *
 * Supports multiple rendering modes:
 * - Flat list (default)
 * - Grouped by prompt
 * - With pivot indicators
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { Observation, Summary, UserPrompt, FeedItem } from '../types';
import { ObservationCard } from './ObservationCard';
import { SummaryCard } from './SummaryCard';
import { PromptCard } from './PromptCard';
import { PromptGroup } from './PromptGroup';
import { PivotIndicator } from './PivotIndicator';
import { ScrollToTop } from './ScrollToTop';
import { UI } from '../constants/ui';
import { detectPivots, groupByPrompt, findPromptText } from '../utils/pivots';

interface FeedEnhancedProps {
  observations: Observation[];
  summaries: Summary[];
  prompts: UserPrompt[];
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  groupByPrompts?: boolean;
  showPivots?: boolean;
  sessionFilter?: string | null;
}

export function FeedEnhanced({
  observations,
  summaries,
  prompts,
  onLoadMore,
  isLoading,
  hasMore,
  groupByPrompts = false,
  showPivots = false,
  sessionFilter = null
}: FeedEnhancedProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  // Keep the callback ref up to date
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          onLoadMoreRef.current?.();
        }
      },
      { threshold: UI.LOAD_MORE_THRESHOLD }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      observer.disconnect();
    };
  }, [hasMore, isLoading]);

  // Filter observations by session if needed
  const filteredObservations = useMemo(() => {
    if (!sessionFilter) return observations;
    return observations.filter(o => o.sdk_session_id === sessionFilter);
  }, [observations, sessionFilter]);

  // Detect pivots
  const pivots = useMemo(() => {
    if (!showPivots || filteredObservations.length < 2) return [];
    return detectPivots(filteredObservations);
  }, [filteredObservations, showPivots]);

  // Render prompt-grouped view
  if (groupByPrompts && filteredObservations.length > 0) {
    const groups = groupByPrompt(filteredObservations);

    return (
      <div className="feed" ref={feedRef}>
        <ScrollToTop targetRef={feedRef} />
        <div className="feed-content">
          {/* Summaries first */}
          {summaries.map(summary => (
            <SummaryCard key={`summary-${summary.id}`} summary={summary} />
          ))}

          {/* Grouped observations */}
          {Array.from(groups.entries()).map(([promptNum, obs]) => {
            const promptText = findPromptText(promptNum, prompts);
            return (
              <PromptGroup
                key={`prompt-${promptNum}`}
                promptNumber={promptNum}
                promptText={promptText}
                observations={obs}
                isExpanded={promptNum === 1} // Auto-expand first prompt
              />
            );
          })}

          {/* Load more indicator */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e' }}>
              <div className="spinner" style={{ display: 'inline-block', marginRight: '10px' }}></div>
              Loading more...
            </div>
          )}
          {hasMore && !isLoading && filteredObservations.length > 0 && (
            <div ref={loadMoreRef} style={{ height: '20px', margin: '10px 0' }} />
          )}
          {!hasMore && filteredObservations.length > 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e', fontSize: '14px' }}>
              No more items to load
            </div>
          )}
        </div>
      </div>
    );
  }

  // Flat view with optional pivots
  const items = useMemo<FeedItem[]>(() => {
    const combined = [
      ...filteredObservations.map(o => ({ ...o, itemType: 'observation' as const })),
      ...summaries.map(s => ({ ...s, itemType: 'summary' as const })),
      ...prompts.map(p => ({ ...p, itemType: 'prompt' as const }))
    ];

    return combined.sort((a, b) => b.created_at_epoch - a.created_at_epoch);
  }, [filteredObservations, summaries, prompts]);

  return (
    <div className="feed" ref={feedRef}>
      <ScrollToTop targetRef={feedRef} />
      <div className="feed-content">
        {items.map((item, index) => {
          const key = `${item.itemType}-${item.id}`;

          // Check if there's a pivot before this observation
          let pivotBefore = null;
          if (showPivots && item.itemType === 'observation') {
            // Find index in observations array (not items array)
            const obsIndex = filteredObservations.findIndex(o => o.id === item.id);
            pivotBefore = pivots.find(p => p.position === obsIndex);
          }

          return (
            <React.Fragment key={key}>
              {pivotBefore && <PivotIndicator pivot={pivotBefore} />}

              {item.itemType === 'observation' && (
                <ObservationCard observation={item} />
              )}
              {item.itemType === 'summary' && (
                <SummaryCard summary={item} />
              )}
              {item.itemType === 'prompt' && (
                <PromptCard prompt={item} />
              )}
            </React.Fragment>
          );
        })}

        {items.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
            No items to display
          </div>
        )}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e' }}>
            <div className="spinner" style={{ display: 'inline-block', marginRight: '10px' }}></div>
            Loading more...
          </div>
        )}
        {hasMore && !isLoading && items.length > 0 && (
          <div ref={loadMoreRef} style={{ height: '20px', margin: '10px 0' }} />
        )}
        {!hasMore && items.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e', fontSize: '14px' }}>
            No more items to load
          </div>
        )}
      </div>
    </div>
  );
}
