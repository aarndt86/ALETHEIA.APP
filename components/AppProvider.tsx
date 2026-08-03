"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// --- Types ---

interface Entry {
  excerpt: string;
  state: string;
  reflectionText?: string;
  status: 'reflection_pending' | 'complete' | 'reflection_failed';
  savedAt: string;
  completedAt?: string;
}

interface UserStats {
  savedEchoCount: number;
  completedReflectionCount: number;
  firstEchoSavedAt: string | null;
  firstReflectionCompletedAt: string | null;
  lastEchoSavedAt: string | null;
  lastReflectionCompletedAt: string | null;
  // Backward-compatible alias for Story progression
  totalEchoCount: number;
  // Insight tracking
  completedInsightCount: number;
  lastInsightCompletedAt: string | null;
  lastInsightShownAtEcho: number;
  insightIntroSeen: boolean;
}

interface AppContextType {
  // Today's state
  isTodayComplete: boolean;
  latestEntry: Entry | null;

  // Emotional state selection
  selectedState: string | null;
  setSelectedState: (s: string | null) => void;

  // Writing draft
  currentDraft: string;
  setCurrentDraft: (d: string) => void;

  // Navigation transitions
  isTransitioningToBook: boolean;
  setIsTransitioningToBook: (v: boolean) => void;

  // User stats (persisted)
  userStats: UserStats;

  // Backward-compat: totalEchoCount for Story progression
  totalEchoCount: number;

  // Lifecycle actions
  saveEcho: (entry: Omit<Entry, 'status' | 'savedAt'>) => Entry;
  completeReflection: (reflection: string) => void;
  markReflectionFailed: () => void;

  // Insight actions
  markInsightCompleted: () => void;
  markInsightSkipped: () => void;
  markInsightIntroSeen: () => void;

  // Session flags
  showPreservedMicrocopy: boolean;
  clearPreservedMicrocopy: () => void;

  // Derived
  shouldShowInsight: boolean;
  hasCompletedFirstReflection: boolean;
  isFirstEcho: boolean;
}

// --- Constants ---

const STORAGE_KEY = 'kairo_user_stats';

const DEFAULT_STATS: UserStats = {
  savedEchoCount: 0,
  completedReflectionCount: 0,
  firstEchoSavedAt: null,
  firstReflectionCompletedAt: null,
  lastEchoSavedAt: null,
  lastReflectionCompletedAt: null,
  totalEchoCount: 1, // Existing default for Story progression testing
  completedInsightCount: 0,
  lastInsightCompletedAt: null,
  lastInsightShownAtEcho: 0,
  insightIntroSeen: false,
};

// --- Helpers ---

function loadStats(): UserStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return DEFAULT_STATS;
  }
}

function persistStats(stats: UserStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // localStorage may be unavailable (private browsing, storage full)
    // Phase B will move to server persistence
  }
}

// --- Context ---

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isTodayComplete, setIsTodayComplete] = useState(false);
  const [latestEntry, setLatestEntry] = useState<Entry | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState('');
  const [isTransitioningToBook, setIsTransitioningToBook] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_STATS);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showPreservedMicrocopy, setShowPreservedMicrocopy] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadStats();
    setUserStats(stored);
    setIsHydrated(true);
  }, []);

  // Persist stats whenever they change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      persistStats(userStats);
    }
  }, [userStats, isHydrated]);

  // --- Lifecycle: Save Echo (before AI) ---
  const saveEcho = useCallback((entryData: Omit<Entry, 'status' | 'savedAt'>): Entry => {
    const now = new Date().toISOString();
    const entry: Entry = {
      ...entryData,
      status: 'reflection_pending',
      savedAt: now,
    };

    setLatestEntry(entry);
    setCurrentDraft('');

    setUserStats(prev => {
      const isFirst = prev.savedEchoCount === 0;
      return {
        ...prev,
        savedEchoCount: prev.savedEchoCount + 1,
        lastEchoSavedAt: now,
        firstEchoSavedAt: isFirst ? now : prev.firstEchoSavedAt,
      };
    });

    return entry;
  }, []);

  // --- Lifecycle: Complete Reflection (AI succeeded + user confirms) ---
  const completeReflection = useCallback((reflection: string) => {
    const now = new Date().toISOString();

    setLatestEntry(prev => prev ? {
      ...prev,
      reflectionText: reflection,
      status: 'complete' as const,
      completedAt: now,
    } : null);

    setIsTodayComplete(true);
    setShowPreservedMicrocopy(true);

    setUserStats(prev => {
      const isFirst = prev.completedReflectionCount === 0;
      return {
        ...prev,
        completedReflectionCount: prev.completedReflectionCount + 1,
        lastReflectionCompletedAt: now,
        firstReflectionCompletedAt: isFirst ? now : prev.firstReflectionCompletedAt,
        // Backward-compat: increment totalEchoCount for Story progression
        totalEchoCount: prev.totalEchoCount + 1,
      };
    });
  }, []);

  // --- Lifecycle: Reflection Failed ---
  const markReflectionFailed = useCallback(() => {
    setLatestEntry(prev => prev ? {
      ...prev,
      status: 'reflection_failed' as const,
    } : null);
  }, []);

  // --- Insight: Completed ---
  const markInsightCompleted = useCallback(() => {
    const now = new Date().toISOString();
    setUserStats(prev => ({
      ...prev,
      completedInsightCount: prev.completedInsightCount + 1,
      lastInsightCompletedAt: now,
      lastInsightShownAtEcho: prev.completedReflectionCount,
    }));
  }, []);

  // --- Insight: Skipped ---
  const markInsightSkipped = useCallback(() => {
    setUserStats(prev => ({
      ...prev,
      lastInsightShownAtEcho: prev.completedReflectionCount,
    }));
  }, []);

  // --- Insight: Intro Seen ---
  const markInsightIntroSeen = useCallback(() => {
    setUserStats(prev => ({
      ...prev,
      insightIntroSeen: true,
    }));
  }, []);

  const clearPreservedMicrocopy = useCallback(() => {
    setShowPreservedMicrocopy(false);
  }, []);

  // Derived state
  const hasCompletedFirstReflection = userStats.completedReflectionCount > 0;
  const isFirstEcho = userStats.savedEchoCount === 0;

  // Insight eligibility: after Echo 7, with natural randomized interval (3-5 echoes)
  const echosSinceLastInsight = userStats.completedReflectionCount - userStats.lastInsightShownAtEcho;
  // Use a simple hash of the echo count to create a natural-feeling interval between 3 and 5
  const insightInterval = 3 + (userStats.completedReflectionCount % 3); // cycles: 3, 4, 5, 3, 4, 5...
  const shouldShowInsight = userStats.completedReflectionCount >= 7 && echosSinceLastInsight >= insightInterval;

  return (
    <AppContext.Provider value={{
      isTodayComplete,
      latestEntry,
      selectedState,
      setSelectedState,
      currentDraft,
      setCurrentDraft,
      isTransitioningToBook,
      setIsTransitioningToBook,
      userStats,
      totalEchoCount: userStats.totalEchoCount,
      saveEcho,
      completeReflection,
      markReflectionFailed,
      markInsightCompleted,
      markInsightSkipped,
      markInsightIntroSeen,
      showPreservedMicrocopy,
      clearPreservedMicrocopy,
      shouldShowInsight,
      hasCompletedFirstReflection,
      isFirstEcho,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
