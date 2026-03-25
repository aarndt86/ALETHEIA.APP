"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RevealMicroPayoff() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Desktop parity: track mouse shifts structurally
    const handleMouseMove = (e: MouseEvent) => {
      // Very minimal shift boundaries (+/- 6px max)
      const x = (e.clientX / window.innerWidth - 0.5) * 12; 
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      setParallax({ x, y });
    };
    
    // Mobile parity: track device gyro gracefully 
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // Invert and map the angles to gentle spatial bounds
      if (e.gamma !== null && e.beta !== null) {
        const x = Math.max(-8, Math.min(8, e.gamma / 4));
        const y = Math.max(-8, Math.min(8, (e.beta - 40) / 4));
        setParallax({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const handleDone = () => {
    setIsTransitioning(true);
    // 8. TRANSITION: Crossfade and resolve into Home intent gateway
    setTimeout(() => router.push('/'), 600);
  };

  return (
    <main className={`min-h-[100dvh] flex flex-col items-center justify-center p-8 sm:p-12 relative overflow-hidden transition-all duration-[600ms] ease-out 
      ${isTransitioning ? 'opacity-0 scale-[1.01]' : 'opacity-100 scale-100'}
      bg-[var(--color-canvas-stone)]
    `}>
      
      {/* 
        1. Contextual Dim Payload 
        Mimics the 90% opacity drop by forcing the pure stone background environment 
      */}

      {/* 
        2. Soft White Card Emergence
        Scales 0.96 -> 1.0 structurally bound to the deep native parallax coordinates 
      */}
      <div 
        className="relative z-10 flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-xs transition-transform duration-500 ease-out"
        style={{
          transform: `translate(${parallax.x}px, ${parallax.y}px)`
        }}
      >
        <section 
          className="relative w-full aspect-[3/4] bg-[#FDFCF8] rounded-sm flex flex-col items-center justify-center p-8 opacity-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]"
          style={{ animation: 'cardEmerge 1.2s cubic-bezier(0.33, 1, 0.68, 1) forwards' }}
        >
          {/* Inner Text masking acting as the "Promise" blur constraint */}
          <div 
            className="w-full h-full flex flex-col gap-6 overflow-hidden pointer-events-none"
            style={{ animation: 'blurPromise 1.5s cubic-bezier(0.33, 1, 0.68, 1) forwards' }}
          >
            {/* Structural hinting (not fully rendered, firmly unreadable) */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-full flex-col flex gap-2.5">
                <div className={`h-2.5 bg-[var(--color-text-ink)]/25 rounded-full ${i % 2 === 0 ? 'w-full' : 'w-[88%]'}`}></div>
                <div className={`h-2.5 bg-[var(--color-text-ink)]/20 rounded-full ${i % 3 === 0 ? 'w-[75%]' : 'w-[95%]'}`}></div>
                <div className={`h-2.5 bg-[var(--color-text-ink)]/15 rounded-full ${i % 4 === 0 ? 'w-[40%]' : 'w-[80%]'}`}></div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Bottom promise text explicitly isolated to draw focus */}
        <div className="mt-16 sm:mt-24 text-center w-full flex flex-col items-center">
          <p 
            className="font-serif text-[15px] sm:text-base text-[var(--color-text-ink)]/80 italic mb-12 opacity-0"
            style={{ animation: 'fadeItem 1s cubic-bezier(0.33, 1, 0.68, 1) 0.6s forwards' }}
          >
            Your story continues to gather.
          </p>

          {/* 6. "DONE" mechanism settling heavily over 800ms offset */}
          <button 
            onClick={handleDone}
            className="group flex flex-col items-center focus:outline-none transition-transform duration-300 active:scale-[0.98] opacity-0"
            style={{ animation: 'fadeItem 1s cubic-bezier(0.33, 1, 0.68, 1) 1.4s forwards' }}
            aria-label="Conclude and return to Home"
          >
            <span className="font-sans text-[var(--color-text-graphite)] text-[10px] sm:text-xs tracking-[0.25em] uppercase border-b border-transparent group-hover:border-[var(--color-text-graphite)]/30 group-hover:text-[var(--color-text-ink)] pb-2 transition-colors duration-[600ms]">
              Done
            </span>
          </button>
        </div>
      </div>

    </main>
  );
}
