// components/landing/LandingPage.tsx
'use client';

import { Hero } from './Hero';
import { Navbar } from './Navbar';
import { AnimatedBackground } from './AnimatedBackground';
import { Marquee } from './Marquee';

export const LandingPage = () => {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <Navbar />
      <Hero />
      <Marquee />
    </main>
  );
};