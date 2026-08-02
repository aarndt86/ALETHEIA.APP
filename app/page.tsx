"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ThresholdScreen() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [stage, setStage] = useState<'landing' | 'authenticating' | 'transiting'>('landing');
  const [activeLine, setActiveLine] = useState("Your story has been unfolding...");

  useEffect(() => {
    setIsMounted(true);
    
    const lines = [
      "You left off in a moment of reflection.",
      "There's more waiting to be written.",
      "You are 3 Echos away from your next page.",
      "Your story has been unfolding..."
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % lines.length;
      setActiveLine(lines[idx]);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleEnter = () => {
    setStage('authenticating');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStage('transiting');
    
    // Smooth transition plunge before native routing
    setTimeout(() => {
      router.push('/home');
    }, 1500);
  };

  return (
    <main className={`relative min-h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-center bg-[#242321] transition-opacity duration-[1500ms]
      ${stage === 'transiting' ? 'opacity-0' : 'opacity-100'}
    `}>
      
      {/* 1. Deep Atmospheric Background */}
      <div 
        className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#413F39] via-[#242321] to-[#121110] transition-all duration-[2000ms]
          ${stage === 'authenticating' ? 'blur-[8px] opacity-60 scale-105' : 'blur-0 opacity-100 scale-100'}
        `}
      ></div>

      {/* 2. Ambient Particle Simulation */}
      <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-1000 ${stage === 'authenticating' ? 'opacity-40' : 'opacity-100'}`}>
        {isMounted && Array.from({ length: 25 }).map((_, i) => (
          <div 
            key={i}
            className="absolute w-1 h-1 bg-[#F5F2EB] rounded-full blur-[1.5px]"
            style={{
               top: `${Math.random() * 100}%`,
               left: `${Math.random() * 100}%`,
               animation: `particleDrift ${12 + Math.random() * 20}s linear infinite`,
               animationDelay: `${Math.random() * 10}s`,
               opacity: 0
            }}
          ></div>
        ))}
      </div>

      {/* 3. Dynamic Ethereal Ribbon Layer */}
      <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none transition-all duration-[3s]
        ${stage === 'authenticating' ? 'blur-[12px] opacity-40 scale-[1.05]' : 'blur-[40px] opacity-[0.8]'}
      `}>
        <div 
          className="absolute w-[180vw] h-[50vh] bg-gradient-to-r from-[rgba(150,140,160,0.12)] via-[rgba(200,190,170,0.18)] to-[rgba(150,140,160,0.08)] rounded-full mix-blend-screen"
          style={{
             top: '25%',
             left: '-40%',
             animation: 'thresholdRibbonFlow 18s ease-in-out infinite alternate',
             filter: stage === 'authenticating' ? 'blur(60px)' : 'blur(45px)'
          }}
        ></div>
        <div 
          className="absolute w-[140vw] h-[40vh] bg-gradient-to-r from-[rgba(230,220,200,0.1)] to-transparent rounded-[100%] mix-blend-screen"
          style={{
             top: '40%',
             left: '-20%',
             animation: 'thresholdRibbonFlow 14s ease-in-out infinite alternate-reverse',
             filter: stage === 'authenticating' ? 'blur(50px)' : 'blur(40px)'
          }}
        ></div>
      </div>

      {/* 4. Cinematic Text Alignment Layer */}
      <section className={`relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-8 text-center transition-all duration-[1200ms] ease-[cubic-bezier(0.33,1,0.68,1)]
        ${stage === 'landing' ? 'translate-y-0 opacity-100 blur-0 pointer-events-auto' : '-translate-y-12 opacity-0 blur-[6px] pointer-events-none'}
      `}>
        
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#EAE8DD] mb-6 tracking-wide animate-[fadeInUp_2.5s_cubic-bezier(0.33,1,0.68,1)_forwards] opacity-0 shadow-black/10 drop-shadow-sm">
          Your life is happening.
        </h1>
        
        <p className="font-serif italic text-lg sm:text-xl text-[#BABCBA] mb-20 animate-[fadeInUp_2.5s_cubic-bezier(0.33,1,0.68,1)_forwards] opacity-0 shadow-black/10 drop-shadow-sm" style={{ animationDelay: '1.2s' }}>
          Most of it quietly disappears.
        </p>

        <p className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[#A89F91] mb-24 animate-[fadeInUp_3s_cubic-bezier(0.33,1,0.68,1)_forwards] opacity-0" style={{ animationDelay: '3s' }}>
          Kairo helps you return to what matters.
        </p>

        {/* Elite Personalized Micro-Moment */}
        <div className="flex flex-col items-center gap-3 mb-32 h-[40px] animate-[fadeIn_3s_ease-out_forwards] opacity-0" style={{ animationDelay: '4.5s' }}>
           <span className="font-serif text-[15px] sm:text-base text-[#F5F2EB] font-medium tracking-wide">Welcome back, Austin.</span>
           <span className="font-serif italic text-[13px] sm:text-[14px] text-[#A89F91] transition-opacity duration-[1500ms] ease-in-out">{activeLine}</span>
        </div>

        {/* Primary Unlocking Action */}
        <button 
           type="button"
           onClick={handleEnter}
           className="group flex flex-col items-center focus:outline-none animate-[fadeIn_3s_ease-out_forwards] opacity-0 pb-4"
           style={{ animationDelay: '6s' }}
           aria-label="Unlock your inner world"
        >
           <span className="font-sans text-[#EAE8DD]/80 text-[10px] sm:text-[11px] tracking-[0.3em] uppercase border-b border-transparent group-hover:border-[#A89F91]/60 group-hover:text-[#F5F2EB] group-hover:drop-shadow-[0_0_8px_rgba(245,242,235,0.4)] pb-3 transition-all duration-[800ms] ease-out">
             Enter Kairo &rarr;
           </span>
        </button>

      </section>

      {/* 5. Spatial Form Layer */}
      <div className={`absolute bottom-0 left-0 w-full flex justify-center pb-[15dvh] sm:pb-[20dvh] transition-all duration-[1200ms] ease-[cubic-bezier(0.33,1,0.68,1)] z-20
        ${stage === 'authenticating' ? 'translate-y-0 opacity-100 blur-0 pointer-events-auto' : 'translate-y-24 opacity-0 blur-[8px] pointer-events-none'}
      `}>
        <form 
          onSubmit={handleLogin} 
          className="w-full max-w-[320px] sm:max-w-sm flex flex-col gap-10 bg-[#3A3834]/30 backdrop-blur-2xl p-10 sm:p-12 rounded-[2px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-[#EAE8DD]/5 relative overflow-hidden"
        >
           <div className="flex flex-col gap-6 relative z-10">
             <input 
              type="email" 
              placeholder="Email" 
              required 
              defaultValue="austin@kairo.app"
              className="w-full bg-transparent border-b border-[#EAE8DD]/20 px-0 py-3 text-[#F5F2EB] placeholder:text-[#EAE8DD]/30 font-sans text-sm tracking-wide focus:outline-none focus:border-[#A89F91] transition-colors" 
             />
             <input 
              type="password" 
              placeholder="Password" 
              required 
              defaultValue="123456"
              className="w-full bg-transparent border-b border-[#EAE8DD]/20 px-0 py-3 text-[#F5F2EB] placeholder:text-[#EAE8DD]/30 font-sans text-sm tracking-wide focus:outline-none focus:border-[#A89F91] transition-colors" 
             />
           </div>
           
           <button 
            type="submit" 
            className="w-full py-5 mt-4 bg-[#EAE8DD]/5 hover:bg-[#EAE8DD]/10 text-[#F5F2EB] font-sans text-[10px] tracking-[0.25em] uppercase hover:shadow-[0_0_20px_rgba(245,242,235,0.1)] transition-all duration-700 focus:outline-none"
           >
             Cross Threshold
           </button>
        </form>
      </div>

    </main>
  );
}
