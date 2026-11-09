"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudioRoute = pathname?.startsWith('/profile/volume-editor');

  return (
    <div 
      className={`mx-auto w-full min-h-[100dvh] sm:min-h-[calc(100vh-5rem)] sm:rounded-[36px] bg-[var(--color-canvas-linen)] relative flex flex-col shadow-2xl overflow-x-hidden ring-1 ring-[var(--color-text-graphite)]/10 transition-all duration-700 ease-in-out
        ${isStudioRoute 
          ? 'max-w-full md:max-w-5xl lg:max-w-6xl' 
          : 'max-w-[430px]'
        }
      `}
    >
      {/* Main Scrollable Content */}
      <div 
        className={`flex-1 relative overflow-y-auto no-scrollbar scroll-smooth
          ${isStudioRoute ? 'pb-8' : 'pb-24'}
        `}
      >
        {children}
      </div>

      {/* Persistent Navigation (hides itself on non-daily routes) */}
      <BottomNav />
    </div>
  );
}
