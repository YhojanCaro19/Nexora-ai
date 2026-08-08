'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const EmptyStateSection = ({ icon: Icon, title, description }: EmptyStateSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl border p-12 flex flex-col items-center justify-center text-center gap-4"
      style={{ background: 'var(--nexora-panel)', borderColor: 'var(--nexora-line)' }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: 'var(--nexora-nova-deep)' }}
      >
        <Icon size={20} strokeWidth={1.5} style={{ color: 'var(--nexora-ink)' }} />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <p className="text-[15px] font-normal" style={{ color: 'var(--nexora-ink)' }}>
          {title}
        </p>
        <p className="text-[13px] font-light leading-relaxed" style={{ color: 'var(--nexora-ink-dim)' }}>
          {description}
        </p>
      </div>
    </motion.div>
  );
};