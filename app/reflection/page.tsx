"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldReflectionRouteFallback() {
  const router = useRouter();
  
  useEffect(() => {
    // If the browser natively loads an orphaned state on '/reflection', bounce to the core app loop immediately.
    router.replace('/');
  }, [router]);

  return <main className="min-h-[100dvh] bg-[var(--color-canvas-linen)]"></main>;
}
