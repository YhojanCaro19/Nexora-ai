// components/landing/Navbar.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Sobre nosotros', href: '/sobre-nosotros' },
  { label: 'Contáctanos', href: '/contacto' },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full relative z-50">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center flex-shrink-0">
          <span className="nexora-logo text-white text-lg tracking-[0.15em] uppercase">
            Nexora
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="text-white/50 text-[13px] font-light tracking-wider hover:text-white/90 transition-colors">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <Link href="/login" className="hidden md:inline-flex text-white/70 text-[13px] font-light tracking-wider border border-white/15 rounded-full px-4 py-1.5 hover:bg-white/5 hover:text-white transition-colors">
            Iniciar sesión
          </Link>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white/50 hover:text-white">
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="md:hidden overflow-hidden bg-[#08090D]/90 backdrop-blur-xl border-b border-white/[0.06] mx-4 rounded-2xl mt-2"
      >
        <div className="p-6 space-y-4">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} onClick={() => setIsOpen(false)} className="block text-white/55 text-sm font-light tracking-wider hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setIsOpen(false)} className="block text-white/70 text-sm font-light tracking-wider">
            Iniciar sesión
          </Link>
        </div>
      </motion.div>

      <style jsx global>{`
        .nexora-logo {
          font-family: var(--font-space-grotesk), sans-serif;
          font-weight: 500;
        }
      `}</style>
    </nav>
  );
};