/**
 * Simple Feed Component with Session Filtering
 *
 * Simplified version that just adds session filtering without complex grouping
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { Observation, Summary, UserPrompt, FeedItem } from '../types';
import { ObservationCard } from './ObservationCard';
import { SummaryCard } from './SummaryCard';
import { PromptCard } from './PromptCard';
import { ScrollToTop } from './ScrollToTop';
import { UI } from '../constants/ui';

interface FeedSimpleProps {
  observations: Observation[];
  summaries: Summary[];
  prompts: UserPrompt[];
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  sessionFilter: string | null;
}

export function FeedSimple({
  observations,
  summaries,
  prompts,
  onLoadMore,
  isLoading,
  hasMore,
  sessionFilter
}: FeedSimpleProps) {
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
          console.log('[FeedSimple] Intersection observer triggered load');
          onLoadMoreRef.current?.();
        }
      },
      { threshold: UI.LOAD_MORE_THRESHOLD }
    );

    observer.observe(element);

    // Trigger immediate load if element is already visible and we have more
    if (hasMore && !isLoading) {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight;
      if (isVisible) {
        console.log('[FeedSimple] Element already visible, triggering immediate load');
        onLoadMoreRef.current?.();
      }
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      observer.disconnect();
    };
  }, [hasMore, isLoading]);

  // Filter by session if provided
  const filteredObservations = useMemo(() => {
    if (!sessionFilter) return observations;
    return observations.filter(o => o.sdk_session_id === sessionFilter);
  }, [observations, sessionFilter]);

  const filteredSummaries = useMemo(() => {
    if (!sessionFilter) return summaries;
    return summaries.filter(s => s.session_id === sessionFilter);
  }, [summaries, sessionFilter]);

  const filteredPrompts = useMemo(() => {
    if (!sessionFilter) return prompts;
    return prompts.filter(p => p.claude_session_id === sessionFilter);
  }, [prompts, sessionFilter]);

  const items = useMemo<FeedItem[]>(() => {
    const combined = [
      ...filteredObservations.map(o => ({ ...o, itemType: 'observation' as const })),
      ...filteredSummaries.map(s => ({ ...s, itemType: 'summary' as const })),
      ...filteredPrompts.map(p => ({ ...p, itemType: 'prompt' as const }))
    ];

    return combined.sort((a, b) => b.created_at_epoch - a.created_at_epoch);
  }, [filteredObservations, filteredSummaries, filteredPrompts]);

  return (
    <div className="feed" ref={feedRef}>
      <ScrollToTop targetRef={feedRef} />
      <div className="feed-content">
        {items.map(item => {
          const key = `${item.itemType}-${item.id}`;
          if (item.itemType === 'observation') {
            return <ObservationCard key={key} observation={item} />;
          } else if (item.itemType === 'summary') {
            return <SummaryCard key={key} summary={item} />;
          } else {
            return <PromptCard key={key} prompt={item} />;
          }
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
