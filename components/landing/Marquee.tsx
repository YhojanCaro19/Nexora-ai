// components/landing/Marquee.tsx
"use client";

import { motion } from 'framer-motion';

const features = [
  'Responde a tus clientes',
  'Vende productos',
  'Gestiona citas',
  'Organiza tu negocio',
  'Automatiza tareas',
  'Trabaja 24/7',
];

export const Marquee = () => {
  return (
    <motion.div
      id="como-funciona"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden py-8 border-t border-b border-white/[0.06]"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
      }}
    >
      <div className="flex whitespace-nowrap">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="flex gap-12"
        >
          {[...features, ...features].map((feature, i) => (
            <span key={i} className="text-white/25 text-sm font-light tracking-wider">
              {feature}
              <span className="mx-6 text-[#4CC2E8]/20">●</span>
            </span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};