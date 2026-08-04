// components/landing/AccentBadge.tsx
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AccentBadgeProps {
  children: ReactNode;
  className?: string;
}

export const AccentBadge = ({ children, className = '' }: AccentBadgeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4CC2E8] opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#4CC2E8] shadow-[0_0_6px_1px_rgba(76,194,232,0.6)]" />
      </span>
      <span className="text-white/55 text-xs font-light tracking-[0.15em]">
        {children}
      </span>
    </motion.div>
  );
};