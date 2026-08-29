// components/i18n/LocaleToggle.tsx
//
// Toggle ES / EN del navbar. El idioma vive en la cookie `LOCALE` (no en
// la URL) — al cambiarlo se fija la cookie con el server action
// setLocale() y se hace router.refresh() para que los Server Components se
// re-rendericen con el nuevo diccionario.
//
// Estilo alineado con los links del navbar: el idioma activo va en blanco
// pleno, el otro en white/40.
'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { setLocale } from '@/app/actions/locale';
import { LOCALES, type Locale } from '@/i18n/locales';

interface LocaleToggleProps {
  className?: string;
}

export function LocaleToggle({ className = '' }: LocaleToggleProps) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pick = (next: Locale) => {
    if (next === active || isPending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <div
      className={`inline-flex items-center gap-1 text-[13px] font-light tracking-wide ${className}`}
      role="group"
      aria-label="Idioma / Language"
    >
      {LOCALES.map((loc, i) => (
        <span key={loc} className="flex items-center gap-1">
          {i > 0 && <span className="text-white/20">/</span>}
          <button
            type="button"
            onClick={() => pick(loc)}
            aria-pressed={loc === active}
            className={`uppercase transition-colors duration-200 disabled:opacity-50 ${
              loc === active
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
            disabled={isPending}
          >
            {loc}
          </button>
        </span>
      ))}
    </div>
  );
}
