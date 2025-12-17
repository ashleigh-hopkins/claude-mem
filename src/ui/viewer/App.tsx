import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { FeedEnhanced } from './components/FeedEnhanced';
import { SessionContext } from './components/SessionContext';
import { ContextSettingsModal } from './components/ContextSettingsModal';
import { useSSE } from './hooks/useSSE';
import { useSettings } from './hooks/useSettings';
import { useStats } from './hooks/useStats';
import { usePagination } from './hooks/usePagination';
import { useTheme } from './hooks/useTheme';
import { useUrlState } from './hooks/useUrlState';
import { useSessions } from './hooks/useSessions';
import { Observation, Summary, UserPrompt } from './types';
import { mergeAndDeduplicateByProject } from './utils/data';

export function App() {
  const [contextPreviewOpen, setContextPreviewOpen] = useState(false);
  const [paginatedObservations, setPaginatedObservations] = useState<Observation[]>([]);
  const [paginatedSummaries, setPaginatedSummaries] = useState<Summary[]>([]);
  const [paginatedPrompts, setPaginatedPrompts] = useState<UserPrompt[]>([]);

  // URL state management
  const urlState = useUrlState();

  const { observations, summaries, prompts, projects, isProcessing, queueDepth, isConnected } = useSSE();
  const { settings, saveSettings, isSaving, saveStatus } = useSettings();
  const { stats, refreshStats } = useStats();
  const { preference, resolvedTheme, setThemePreference } = useTheme();
  const pagination = usePagination(urlState.state.project || '');

  // Fetch sessions for selector
  const { sessions, isLoading: sessionsLoading } = useSessions(urlState.state.project || null);

  // Find selected session summary
  const selectedSessionSummary = useMemo(() => {
    if (!urlState.state.session || !sessions) return null;
    return sessions.find(s => s.sdk_session_id === urlState.state.session) || null;
  }, [urlState.state.session, sessions]);

  // When filtering by project: ONLY use paginated data (API-filtered)
  // When showing all projects: merge SSE live data with paginated data
  const allObservations = useMemo(() => {
    let items = urlState.state.project
      ? paginatedObservations
      : mergeAndDeduplicateByProject(observations, paginatedObservations);

    // Apply search filter (client-side for now)
    if (urlState.state.search) {
      const query = urlState.state.search.toLowerCase();
      items = items.filter(o =>
        o.title?.toLowerCase().includes(query) ||
        o.subtitle?.toLowerCase().includes(query) ||
        o.narrative?.toLowerCase().includes(query)
      );
    }

    // Apply session filter
    if (urlState.state.session) {
      items = items.filter(o => o.sdk_session_id === urlState.state.session);
    }

    return items;
  }, [observations, paginatedObservations, urlState.state.project, urlState.state.search, urlState.state.session]);

  const allSummaries = useMemo(() => {
    let items = urlState.state.project
      ? paginatedSummaries
      : mergeAndDeduplicateByProject(summaries, paginatedSummaries);

    // Apply session filter
    if (urlState.state.session) {
      items = items.filter(s => s.session_id === urlState.state.session);
    }

    return items;
  }, [summaries, paginatedSummaries, urlState.state.project, urlState.state.session]);

  const allPrompts = useMemo(() => {
    let items = urlState.state.project
      ? paginatedPrompts
      : mergeAndDeduplicateByProject(prompts, paginatedPrompts);

    // Apply session filter
    if (urlState.state.session) {
      items = items.filter(p => p.claude_session_id === urlState.state.session);
    }

    return items;
  }, [prompts, paginatedPrompts, urlState.state.project, urlState.state.session]);

  // Toggle context preview modal
  const toggleContextPreview = useCallback(() => {
    setContextPreviewOpen(prev => !prev);
  }, []);

  // Handle loading more data
  const handleLoadMore = useCallback(async () => {
    try {
      const [newObservations, newSummaries, newPrompts] = await Promise.all([
        pagination.observations.loadMore(),
        pagination.summaries.loadMore(),
        pagination.prompts.loadMore()
      ]);

      if (newObservations.length > 0) {
        setPaginatedObservations(prev => [...prev, ...newObservations]);
      }
      if (newSummaries.length > 0) {
        setPaginatedSummaries(prev => [...prev, ...newSummaries]);
      }
      if (newPrompts.length > 0) {
        setPaginatedPrompts(prev => [...prev, ...newPrompts]);
      }
    } catch (error) {
      console.error('Failed to load more data:', error);
    }
  }, [pagination.observations, pagination.summaries, pagination.prompts]);

  // Reset paginated data and load first page when filter changes
  useEffect(() => {
    setPaginatedObservations([]);
    setPaginatedSummaries([]);
    setPaginatedPrompts([]);
    handleLoadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlState.state.project]);

  // Determine if we should group by prompts (when session filtered and multiple prompts exist)
  const shouldGroupByPrompts = useMemo(() => {
    return !!urlState.state.session && allObservations.length > 5;
  }, [urlState.state.session, allObservations.length]);

  // Show pivots when viewing a single session
  const shouldShowPivots = !!urlState.state.session;

  return (
    <>
      <Header
        isConnected={isConnected}
        projects={projects}
        currentFilter={urlState.state.project || ''}
        onFilterChange={urlState.setProject}
        isProcessing={isProcessing}
        queueDepth={queueDepth}
        themePreference={preference}
        onThemeChange={setThemePreference}
        onContextPreviewToggle={toggleContextPreview}
        searchQuery={urlState.state.search}
        onSearchChange={urlState.setSearch}
        sessions={sessions}
        selectedSession={urlState.state.session}
        onSessionChange={urlState.setSession}
        sessionsLoading={sessionsLoading}
      />

      {/* Session context header */}
      {selectedSessionSummary && (
        <SessionContext
          session={selectedSessionSummary}
          observationCount={allObservations.length}
          onClear={() => urlState.setSession(null)}
        />
      )}

      <FeedEnhanced
        observations={allObservations}
        summaries={allSummaries}
        prompts={allPrompts}
        onLoadMore={handleLoadMore}
        isLoading={pagination.observations.isLoading || pagination.summaries.isLoading || pagination.prompts.isLoading}
        hasMore={pagination.observations.hasMore || pagination.summaries.hasMore || pagination.prompts.hasMore}
        groupByPrompts={shouldGroupByPrompts}
        showPivots={shouldShowPivots}
        sessionFilter={urlState.state.session}
      />

      <ContextSettingsModal
        isOpen={contextPreviewOpen}
        onClose={toggleContextPreview}
        settings={settings}
        onSave={saveSettings}
        isSaving={isSaving}
        saveStatus={saveStatus}
      />
    </>
  );
}
