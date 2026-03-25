"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAppContext } from '@/components/AppProvider';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setIsTransitioningToBook } = useAppContext();
  const [optimisticPath, setOptimisticPath] = useState(pathname);

  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  // Bottom Navigation is strictly prohibited outside of Aletheia Mode.
  // The sacred loop (Home -> Check-In -> Echo -> Reflection -> Reveal) must never display UI chrome.
  const isAletheiaMode = ['/aletheia', '/timeline', '/story', '/profile'].includes(pathname);
  if (!isAletheiaMode) return null;

  const navItems = [
    { name: "Dashboard", href: "/aletheia" },
    { name: "Archive", href: "/timeline" },
    { name: "Book", href: "/story" }
  ];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (pathname === '/timeline' && href === '/story') {
      e.preventDefault();
      
      setOptimisticPath(href);
      setIsTransitioningToBook(true);
      
      setTimeout(() => {
        router.push(href);
        setTimeout(() => setIsTransitioningToBook(false), 800);
      }, 300);
    } else {
      setOptimisticPath(href);
    }
  };

  return (
    <nav className="absolute bottom-0 w-full h-[88px] pb-safe pt-2 bg-[var(--color-canvas-linen)]/90 backdrop-blur-md border-t border-[var(--color-canvas-stone)] flex items-center justify-around z-40 transition-all duration-[600ms] animate-[fadeIn_0.6s_ease-out_forwards]">
      {navItems.map((item) => {
        const isActive = optimisticPath === item.href;
        return (
          <Link 
            key={item.href} 
            href={item.href}
            onClick={(e) => handleNavClick(e, item.href)}
            className={`flex flex-col items-center justify-center w-full h-full pb-4 pt-2 transition-opacity duration-[140ms] ease-out focus:outline-none ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}
          >
            <span className={`text-[10px] tracking-[0.2em] uppercase font-sans mb-1.5 transition-colors duration-[140ms] ease-out ${isActive ? 'text-[var(--color-text-ink)]' : 'text-[var(--color-text-graphite)]'}`}>
              {item.name}
            </span>
            <div className={`w-1 h-1 rounded-full bg-[var(--color-accent-clay)] transition-all duration-[240ms] ease-out ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
          </Link>
        );
      })}
    </nav>
  );
}
