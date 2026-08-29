// components/landing/WhatsAppFab.tsx
//
// Botón flotante de WhatsApp para dudas — abajo a la derecha, fijo, sobre
// toda la experiencia (landing + auth). Se monta en
// app/(experience)/layout.tsx.
//
// CONFIGURACIÓN: el único ajuste es el número destino, vía la variable de
// entorno `NEXT_PUBLIC_WHATSAPP_NUMBER` en formato E.164 SIN el "+"
// (ej. 573001234567). Si no está seteada, el botón no se renderiza —
// AVENTHRA todavía no tiene su propio WhatsApp, así que hasta que exista
// simplemente no aparece nada roto.
//
// Desktop: píldora con ícono + texto. Mobile: solo el ícono (el texto se
// oculta) para no comerse la pantalla.
'use client';

import { useTranslations } from 'next-intl';
import { WhatsAppGlyph } from '@/components/landing/BrandGlyphs';

// E.164 sin "+" — solo dígitos. wa.me lo quiere así.
const RAW_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';
const NUMBER = RAW_NUMBER.replace(/[^\d]/g, '');

export function WhatsAppFab() {
  const t = useTranslations('whatsapp');

  if (!NUMBER) return null;

  const href = `https://wa.me/${NUMBER}?text=${encodeURIComponent(t('prefill'))}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('aria')}
      className="group fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 flex items-center gap-2.5 rounded-full border border-white/15 bg-black/60 py-2.5 pr-3 pl-2.5 text-sm text-white/90 shadow-2xl backdrop-blur-xl transition-all duration-200 hover:border-white/30 hover:bg-black/80 hover:text-white sm:pr-4 sm:pl-3"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        <WhatsAppGlyph className="h-6 w-6" />
      </span>
      <span className="hidden font-light sm:inline">{t('cta')}</span>
    </a>
  );
}
