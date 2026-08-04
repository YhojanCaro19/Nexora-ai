// components/landing/Hero.tsx
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { NexoraRobotHead } from './NexoraRobotHead';
import { AccentBadge } from './AccentBadge';

export const Hero = () => {
  return (
    <section id="core" className="relative h-screen flex items-center justify-center px-6">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center lg:items-start text-center lg:text-left"
        >
          <div className="mb-8">
            <AccentBadge>EMPLEADO IA — PREMIUM</AccentBadge>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="nexora-headline text-4xl md:text-5xl lg:text-7xl font-light leading-[1.1] tracking-tight mb-6"
          >
            <span className="block text-metal">Siempre hay alguien</span>
            <span className="block text-glass">cuidando tu negocio.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-white/45 text-sm md:text-base font-light leading-relaxed max-w-md tracking-wide mb-10"
          >
            NEXORA AI es un empleado que trabaja 24/7. Responde, vende,
            agenda, organiza y automatiza — para que tú te enfoques en lo que importa.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4"
          >
            {/* Ajusta el href si tu ruta de registro vive en otro lugar
                dentro de app/(auth)/ — por ahora apunta al dashboard */}
            <Link href="/dashboard">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="group px-8 py-4 rounded-full bg-[#4CC2E8] text-black text-sm font-medium tracking-wide hover:shadow-[0_0_40px_rgba(76,194,232,0.25)] transition-shadow relative overflow-hidden inline-flex items-center gap-2 cursor-pointer"
              >
                Empezar ahora
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </motion.span>
            </Link>

            <a href="#como-funciona">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="px-8 py-4 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/10 text-white/80 text-sm font-light tracking-wide hover:bg-white/[0.08] transition-colors inline-flex items-center cursor-pointer"
              >
                Ver cómo funciona
              </motion.span>
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center"
        >
          <NexoraRobotHead />
        </motion.div>
      </div>

      {/* Indicador de scroll */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-white/20 text-xs font-light tracking-widest">
          DESLIZA
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
          className="w-[1px] h-8 bg-gradient-to-b from-[#4CC2E8]/20 to-transparent"
        />
      </motion.div>

      <style jsx global>{`
        .nexora-headline {
          font-family: 'General Sans', var(--font-geist-sans, ui-sans-serif), sans-serif;
        }
        .text-metal {
          background: linear-gradient(100deg, #b8bcc4 0%, #dde0e6 35%, #ffffff 50%, #d2d6dd 65%, #b8bcc4 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: metal-sheen 8s ease-in-out infinite;
        }
        .text-glass {
          background: linear-gradient(110deg, #ffffff 0%, #a5b4fc 30%, #4cc2e8 55%, #c4b5fd 80%, #ffffff 100%);
          background-size: 250% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: metal-sheen 10s ease-in-out infinite;
        }
        @keyframes metal-sheen {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .text-metal, .text-glass { animation: none; }
        }
      `}</style>
    </section>
  );
};