import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "../styles/globals.css";
import BottomNav from "@/components/BottomNav";
import { AppProvider } from "@/components/AppProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kairo",
  description: "A calm, reflective, literary experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-[var(--color-canvas-stone)] antialiased sm:p-4 md:p-8 lg:p-12 transition-all">
        {/* Mobile Viewport Constraint Wrapper */}
        <div className="mx-auto max-w-[430px] w-full min-h-[100dvh] sm:min-h-[calc(100vh-6rem)] sm:rounded-[40px] bg-[var(--color-canvas-linen)] relative flex flex-col shadow-2xl overflow-hidden ring-1 ring-[var(--color-text-graphite)]/10">
          
          <AppProvider>
            {/* Main Scrollable Content */}
            <div className="flex-1 pb-24 relative overflow-y-auto no-scrollbar scroll-smooth">
              {children}
            </div>

            {/* Persistent Navigation */}
            <BottomNav />
          </AppProvider>

        </div>
      </body>
    </html>
  );
}
