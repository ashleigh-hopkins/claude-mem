/**
 * URL State Management Hook
 *
 * Persists UI state in URL query parameters for:
 * - Bookmarking specific views
 * - Sharing links
 * - Browser back/forward navigation
 * - State preservation on refresh
 */

import { useState, useEffect, useCallback } from 'react';

export interface UrlState {
  project: string | null;
  session: string | null;
  search: string | null;
  type: string | null;
  from: string | null;
  to: string | null;
}

export function useUrlState() {
  const [state, setState] = useState<UrlState>(() => {
    if (typeof window === 'undefined') {
      return {
        project: null,
        session: null,
        search: null,
        type: null,
        from: null,
        to: null
      };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      project: params.get('project'),
      session: params.get('session'),
      search: params.get('q'),
      type: params.get('type'),
      from: params.get('from'),
      to: params.get('to')
    };
  });

  // Update URL when state changes
  const updateUrl = useCallback((newState: Partial<UrlState>) => {
    const params = new URLSearchParams();

    const merged = { ...state, ...newState };

    // Only add non-null values to URL
    if (merged.project) params.set('project', merged.project);
    if (merged.session) params.set('session', merged.session);
    if (merged.search) params.set('q', merged.search);
    if (merged.type) params.set('type', merged.type);
    if (merged.from) params.set('from', merged.from);
    if (merged.to) params.set('to', merged.to);

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.pushState({}, '', newUrl);
    setState(merged);
  }, [state]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setState({
        project: params.get('project'),
        session: params.get('session'),
        search: params.get('q'),
        type: params.get('type'),
        from: params.get('from'),
        to: params.get('to')
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Individual setters for convenience
  const setProject = useCallback((project: string | null) => {
    updateUrl({ project, session: null }); // Clear session when changing project
  }, [updateUrl]);

  const setSession = useCallback((session: string | null) => {
    updateUrl({ session });
  }, [updateUrl]);

  const setSearch = useCallback((search: string | null) => {
    updateUrl({ search });
  }, [updateUrl]);

  const setType = useCallback((type: string | null) => {
    updateUrl({ type });
  }, [updateUrl]);

  const setDateRange = useCallback((from: string | null, to: string | null) => {
    updateUrl({ from, to });
  }, [updateUrl]);

  const clearFilters = useCallback(() => {
    updateUrl({
      project: null,
      session: null,
      search: null,
      type: null,
      from: null,
      to: null
    });
  }, [updateUrl]);

  return {
    state,
    setProject,
    setSession,
    setSearch,
    setType,
    setDateRange,
    clearFilters,
    updateUrl
  };
}
