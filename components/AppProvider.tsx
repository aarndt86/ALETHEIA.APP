"use client";
import React, { createContext, useContext, useState } from 'react';

interface Entry {
  excerpt: string;
  state: string;
}

interface AppContextType {
  isTodayComplete: boolean;
  latestEntry: Entry | null;
  completeToday: (entry: Entry) => void;
  selectedState: string | null;
  setSelectedState: (s: string | null) => void;
  currentDraft: string;
  setCurrentDraft: (d: string) => void;
  isTransitioningToBook: boolean;
  setIsTransitioningToBook: (v: boolean) => void;
  totalEchoCount: number;
  incrementEchoCount: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isTodayComplete, setIsTodayComplete] = useState(false);
  const [latestEntry, setLatestEntry] = useState<Entry | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState('');
  const [isTransitioningToBook, setIsTransitioningToBook] = useState(false);
  const [totalEchoCount, setTotalEchoCount] = useState(1); // Starting at 1 for explicit partial-blur testing

  const incrementEchoCount = () => {
    setTotalEchoCount(prev => prev + 1);
  };

  const completeToday = (entry: Entry) => {
    setIsTodayComplete(true);
    setLatestEntry(entry);
    setCurrentDraft(''); // Clear draft
    incrementEchoCount();
  };

  return (
    <AppContext.Provider value={{ 
      isTodayComplete, 
      latestEntry, 
      completeToday, 
      selectedState, 
      setSelectedState,
      currentDraft,
      setCurrentDraft,
      isTransitioningToBook,
      setIsTransitioningToBook,
      totalEchoCount,
      incrementEchoCount
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
