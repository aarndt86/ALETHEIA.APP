"use client";

import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // If navigating into the highly tactile book reveal sequence, 
  // bypass the generic crossfade template wrapper entirely!
  // The Book page handles its own iOS-grade mathematical transitions flawlessly.
  if (pathname === '/story') {
    return <>{children}</>;
  }

  // Pure, static structural crossfade between standard routes
  return (
    <div className="animate-[fadeIn_0.6s_ease-in-out_forwards] w-full h-full">
      {children}
    </div>
  );
}
