import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { FeedSimple } from './components/FeedSimple';
import { SessionContext } from './components/SessionContext';
import { ContextSettingsModal } from './components/ContextSettingsModal';
import { LogsDrawer } from './components/LogsModal';
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
  const [logsModalOpen, setLogsModalOpen] = useState(false);
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
    return sessions.find(s => s.session_id === urlState.state.session) || null;
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


    return items;
  }, [observations, paginatedObservations, urlState.state.project, urlState.state.search, urlState.state.session]);

  const allSummaries = useMemo(() => {
    const items = urlState.state.project
      ? paginatedSummaries
      : mergeAndDeduplicateByProject(summaries, paginatedSummaries);

    return items;
  }, [summaries, paginatedSummaries, urlState.state.project]);

  const allPrompts = useMemo(() => {
    const items = urlState.state.project
      ? paginatedPrompts
      : mergeAndDeduplicateByProject(prompts, paginatedPrompts);

    return items;
  }, [prompts, paginatedPrompts, urlState.state.project]);

  // Toggle context preview modal
  const toggleContextPreview = useCallback(() => {
    setContextPreviewOpen(prev => !prev);
  }, []);

  // Toggle logs modal
  const toggleLogsModal = useCallback(() => {
    setLogsModalOpen(prev => !prev);
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

  // Show pivots when viewing a single session

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

      <FeedSimple
        observations={allObservations}
        summaries={allSummaries}
        prompts={allPrompts}
        onLoadMore={handleLoadMore}
        isLoading={pagination.observations.isLoading || pagination.summaries.isLoading || pagination.prompts.isLoading}
        hasMore={pagination.observations.hasMore || pagination.summaries.hasMore || pagination.prompts.hasMore}
      />

      <ContextSettingsModal
        isOpen={contextPreviewOpen}
        onClose={toggleContextPreview}
        settings={settings}
        onSave={saveSettings}
        isSaving={isSaving}
        saveStatus={saveStatus}
      />

      <button
        className="console-toggle-btn"
        onClick={toggleLogsModal}
        title="Toggle Console"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      </button>

      <LogsDrawer
        isOpen={logsModalOpen}
        onClose={toggleLogsModal}
      />
    </>
  );
}
