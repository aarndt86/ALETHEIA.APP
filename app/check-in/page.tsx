"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckInRouteFallback() {
  const router = useRouter();
  
  useEffect(() => {
    // If the browser natively loads an orphaned state on '/check-in', bounce to the core app loop immediately.
    router.replace('/echo');
  }, [router]);

  return <main className="min-h-[100dvh] bg-[var(--color-canvas-linen)]"></main>;
}
