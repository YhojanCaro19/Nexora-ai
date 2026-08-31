// components/landing/WhatsAppFab.tsx
//
// Botón flotante de WhatsApp para dudas — abajo a la derecha, fijo, sobre
// toda la experiencia (landing + auth). Se monta en
// app/(experience)/layout.tsx.
//
// Estado normal: solo el ícono (círculo). Al pasar el mouse / enfocar por
// teclado, se despliega hacia la izquierda y muestra "¿Tienes dudas?
// Escríbenos". El ícono NO es el verde de WhatsApp: es la silueta del
// logo con el degradado de marca AVENTHRA (cian → violeta).
//
// CONFIGURACIÓN: el único ajuste es el número destino, vía la variable de
// entorno `NEXT_PUBLIC_WHATSAPP_NUMBER` en formato E.164 SIN el "+"
// (ej. 573001234567).
//   - En PRODUCCIÓN: si no está seteada, el botón no se renderiza.
//   - En DESARROLLO: si no está seteada, se usa un número placeholder para
//     poder ver/ajustar el botón.
//
// OJO: al cambiar `.env.local` hay que reiniciar `npm run dev`.
'use client';

import { useTranslations } from 'next-intl';

// E.164 sin "+" — solo dígitos. wa.me lo quiere así.
const CONFIGURED = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
const IS_DEV = process.env.NODE_ENV !== 'production';
const DEV_PLACEHOLDER = '573000000000';

const NUMBER = CONFIGURED || (IS_DEV ? DEV_PLACEHOLDER : '');
const IS_PLACEHOLDER = !CONFIGURED;

// Silueta del logo de WhatsApp (burbuja + auricular como hueco) con el
// degradado de marca AVENTHRA — NO el verde oficial.
function WhatsAppMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aventhra-wa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4CC2E8" />
          <stop offset="55%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#F0ABFC" />
        </linearGradient>
      </defs>
      {/* Burbuja con el auricular recortado (fill-rule evenodd). */}
      <path
        fill="url(#aventhra-wa)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2Zm-3 5.7c.2 0 .3 0 .4.3l.6 1.5c.1.2.1.4 0 .5l-.4.5c-.1.1-.3.2-.1.5.1.3.7 1.2 1.5 1.9 1.1 1 2 1.3 2.2 1.4.2.1.4.1.5-.1l.7-.9c.2-.3.4-.2.7-.1l2 1 .5.4c0 .1 0 .6-.2 1.3-.2.6-1.4 1.3-1.9 1.3s-1 .2-3.4-.8c-2.8-1.2-4.7-4-4.8-4.2-.2-.2-1.2-1.6-1.2-2.9 0-1.3.7-2 1-2.3.2-.3.5-.3.7-.3H9Z"
      />
    </svg>
  );
}

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
      title={
        IS_PLACEHOLDER
          ? 'Número placeholder — configura NEXT_PUBLIC_WHATSAPP_NUMBER'
          : undefined
      }
      className="group fixed bottom-5 right-5 z-50 flex items-center rounded-full border border-white/15 bg-black/60 p-3 text-sm text-white/90 shadow-2xl outline-none backdrop-blur-xl transition-colors duration-200 hover:border-white/25 hover:bg-black/80 hover:text-white focus-visible:border-white/25"
    >
      {/* Texto a la IZQUIERDA, ícono a la derecha: el ícono queda anclado
          en la esquina (el <a> se posiciona por `right-5`) y el texto se
          despliega hacia la izquierda en hover/focus. Colapsado por
          defecto con max-w-0 + overflow-hidden. */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out group-hover:max-w-xs group-focus-visible:max-w-xs">
        <span className="block pr-2.5 pl-1 font-light">{t('cta')}</span>
      </span>

      <WhatsAppMark className="h-6 w-6 shrink-0" />
    </a>
  );
}
