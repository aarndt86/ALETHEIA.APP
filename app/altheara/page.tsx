"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AlthearaRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return <main className="min-h-[100dvh] bg-[var(--color-canvas-linen)]"></main>;
}
