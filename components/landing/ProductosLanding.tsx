// components/landing/ProductosLanding.tsx
//
// Landing completa de "Producto" / Pantalla 2. AVENTHRA como embudo
// completo: ATRAE clientes (marketing AI — estrategia, copy, creativos,
// publicación y anuncios en Meta/Google/TikTok) y los ATIENDE (el agente
// que responde y vende por WhatsApp/Instagram). Estructura inspirada en
// saleads.ai, mensaje de AVENTHRA:
//
//   Problema → Cómo funciona → Dónde vender → Los números
//   → Planes → Preguntas frecuentes → CTA final
//
// La honestidad sobre el estado real del marketing AI (todavía en
// implementación) vive en el FAQ, no en un badge.
//
// Se usa en dos lugares: el Momento 2 del Home (HomeExperience) y la ruta
// /productos.
//
// TEXTO: todo el copy vive en messages/<locale>.json bajo `landing.*`
// (ES/EN). Acá quedan solo los datos que no se traducen: valores de las
// cifras animadas, íconos de marca y las URLs de las fuentes. Los ids de
// sección ('planes', 'faq') los usan los navbars (useSectionNav).
'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ProductosHero } from '@/components/landing/ProductosHero';
import { OrbitButton } from '@/components/landing/OrbitButton';
import { Counter } from '@/components/landing/Counter';
import { Plans } from '@/components/landing/Plans';

// ── helpers de estilo ────────────────────────────────────────────────────
const SECTION = 'relative w-full px-6 py-24 md:px-10 md:py-28 lg:px-16 lg:py-36';
const TITLE =
  'nexora-headline mx-auto max-w-3xl text-center text-3xl font-normal leading-[1.15] tracking-tight text-white md:text-4xl lg:text-5xl';
const LEAD = 'aventhra-copy mx-auto mt-5 max-w-xl text-center text-white/45';
const CARD =
  'rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 backdrop-blur-sm md:p-8';

// Cifra grande multicolor — el mismo degradado animado que usan los
// títulos de la landing (.aventhra-iridescent, globals.css). El tamaño se
// pasa por uso: "US$3.000" no cabe en una card angosta a text-6xl.
const STAT_NUMBER =
  'aventhra-iridescent nexora-headline font-semibold leading-none';

// Resalte multicolor dentro de un título (tag <hl> en los mensajes).
const hl = (chunks: React.ReactNode) => (
  <span className="aventhra-iridescent">{chunks}</span>
);

// ── 1. El problema ───────────────────────────────────────────────────────
function Problema() {
  const t = useTranslations('landing.problema');
  const copy = t.raw('cards') as {
    label: string;
    headline: string;
    body: string;
    sourceLabel: string;
  }[];

  const stats = [
    <Counter key="s0" to={3000} prefix="US$" />,
    <Counter key="s1" to={70} suffix="%" />,
    <Counter key="s2" to={78} suffix="%" />,
  ];
  const sourceHrefs = [
    'https://www.webfx.com/blog/marketing/marketing-agency-cost/',
    'https://investors.fiverr.com/news-releases/news-release-details/fiverr-small-business-month-survey-marketing-seen-key-growth',
    'https://hbr.org/2011/03/the-short-life-of-online-sales-leads',
  ];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>{t.rich('title', { hl })}</h2>
      <p className={LEAD}>{t('lead')}</p>

      <div className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
        {copy.map((c, i) => (
          <div
            key={c.sourceLabel}
            className={`${CARD} flex flex-col items-center text-center`}
          >
            <p className={`${STAT_NUMBER} text-4xl md:text-5xl`}>{stats[i]}</p>
            <p className="mt-4 max-w-xs text-sm font-medium leading-relaxed text-white/70">
              {c.label}
            </p>
            <h3 className="mt-6 text-lg font-medium text-white md:text-xl">
              {c.headline}
            </h3>
            <p className="aventhra-copy mt-3 max-w-xs text-sm leading-relaxed text-white/45">
              {c.body}
            </p>
            <p className="mt-5">
              <a
                href={sourceHrefs[i]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white/20 underline underline-offset-2 transition-colors hover:text-white/45"
              >
                {c.sourceLabel}
              </a>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 2. Cómo funciona ─────────────────────────────────────────────────────
function ComoFunciona() {
  const t = useTranslations('landing.comoFunciona');
  const steps = t.raw('steps') as { title: string; body: string }[];

  return (
    <section className={SECTION}>
      <div className="flex flex-col items-center">
        <span className="h-px w-16 bg-gradient-to-r from-transparent via-[#818CF8] to-transparent" />
        <p className="aventhra-iridescent nexora-headline mt-4 text-xs font-semibold uppercase tracking-[0.32em]">
          {t('eyebrow')}
        </p>
      </div>
      <h2 className={`${TITLE} mt-5`}>{t.rich('title', { hl })}</h2>
      <p className={LEAD}>{t('lead')}</p>

      {/* Mapa de proceso: 01 → 02 → 03 → … En desktop fluye a la derecha;
          en mobile se apila y la flecha apunta hacia abajo. */}
      <ol className="mx-auto mt-16 flex max-w-6xl flex-col items-stretch gap-2 lg:flex-row">
        {steps.map((s, i) => (
          <Fragment key={s.title}>
            <li className="flex flex-1 flex-col items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-center backdrop-blur-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                <span className="aventhra-iridescent nexora-headline text-sm font-semibold">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </span>
              <h3 className="mt-4 text-[15px] font-medium leading-snug text-white">
                {s.title}
              </h3>
              <p className="aventhra-copy mt-2 text-[13px] leading-relaxed text-white/45">
                {s.body}
              </p>
            </li>
            {i < steps.length - 1 && (
              <ArrowRight
                aria-hidden
                size={18}
                className="mx-auto shrink-0 rotate-90 self-center text-white/25 lg:rotate-0"
              />
            )}
          </Fragment>
        ))}
      </ol>
    </section>
  );
}

// ── 3. Dónde vender ──────────────────────────────────────────────────────
function DondeVender() {
  const t = useTranslations('landing.dondeVender');
  const adsCopy = t.raw('ads') as { name: string; body: string }[];

  // Logos reales de marca — mismos archivos que usa el panel para "Conectar
  // redes" (public/channels/, ver channel-icons.tsx), no los glyphs SVG.
  const redes = [
    { name: 'WhatsApp', src: '/channels/whatsapp.png' },
    { name: 'Instagram', src: '/channels/instagram.png' },
    { name: 'Facebook', src: '/channels/messenger.png' },
    { name: 'TikTok', src: '/channels/tiktok.png' },
  ];
  // Logos reales de marca (mismos archivos que Marketing → Conexiones en el
  // panel, public/marketing/), no los glyphs monocromo de arriba — estas
  // tarjetas venden la plataforma de pauta específica, conviene que se
  // reconozcan de un vistazo.
  const adLogos = ['/marketing/meta.png', '/marketing/google.png', '/marketing/tiktok.png'];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>{t.rich('title', { hl })}</h2>
      <p className={LEAD}>{t('lead')}</p>

      <div className="mx-auto mt-14 flex max-w-2xl flex-wrap items-start justify-center gap-x-12 gap-y-8">
        {redes.map(({ name, src }) => (
          <div key={name} className="flex w-20 flex-col items-center gap-3">
            <Image src={src} alt={name} width={36} height={36} unoptimized className="object-contain" />
            <span className="text-xs text-white/60">{name}</span>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
        {adsCopy.map(({ name, body }, i) => {
          return (
            <div
              key={name}
              className={`${CARD} flex flex-col items-center text-center`}
            >
              <Image src={adLogos[i]} alt={name} width={40} height={40} unoptimized className="object-contain" />
              <h3 className="mt-5 text-lg font-medium text-white">{name}</h3>
              <p className="aventhra-copy mt-3 max-w-xs text-sm leading-relaxed text-white/45">
                {body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── 4. Los números ───────────────────────────────────────────────────────
function Numeros() {
  const t = useTranslations('landing.numeros');
  const labels = t.raw('stats') as string[];

  const values: React.ReactNode[] = [
    <>{t('stat1Value')}</>,
    <Counter key="n1" to={32} suffix="%" />,
    <Counter key="n2" to={11} suffix="%" />,
    <Counter key="n3" to={21} suffix="×" />,
  ];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>{t.rich('title', { hl })}</h2>
      <p className={LEAD}>{t('lead')}</p>

      <div className="mx-auto mt-14 grid max-w-3xl gap-x-10 gap-y-12 sm:grid-cols-2">
        {labels.map((label, i) => (
          <div key={label} className="flex flex-col items-center text-center">
            <p className={`${STAT_NUMBER} text-6xl md:text-7xl`}>{values[i]}</p>
            <p className="aventhra-copy mt-4 max-w-xs text-sm leading-relaxed text-white/45">
              {label}
            </p>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-14 max-w-md text-center text-[11px] text-white/20">
        {t('footnote')}
      </p>
    </section>
  );
}

// ── 6. Preguntas frecuentes ──────────────────────────────────────────────
function Faq() {
  const t = useTranslations('landing.faq');
  const items = t.raw('items') as { q: string; a: string }[];

  return (
    <section id="faq" className={`${SECTION} scroll-mt-24`}>
      <h2 className={TITLE}>{t('title')}</h2>

      <div className="mx-auto mt-12 max-w-2xl divide-y divide-white/[0.08] border-y border-white/[0.08]">
        {items.map((it) => (
          <details key={it.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-[15px] font-medium text-white/85 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
              {it.q}
              <ChevronDown
                size={18}
                className="shrink-0 text-white/40 transition-transform duration-300 group-open:rotate-180"
              />
            </summary>
            <p className="aventhra-copy pb-5 pr-8 text-sm leading-relaxed text-white/45">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ── 7. CTA final ─────────────────────────────────────────────────────────
function CtaFinal() {
  const t = useTranslations('landing.cta');

  return (
    <section className={`${SECTION} pb-40`}>
      <h2 className={TITLE}>{t.rich('title', { hl })}</h2>
      <p className={LEAD}>{t('lead')}</p>

      <div className="mt-10 flex flex-col items-center">
        <OrbitButton href="/login">{t('button')}</OrbitButton>
        <p className="mt-4 text-xs text-white/30">{t('subnote')}</p>
      </div>
    </section>
  );
}

// ── composición ──────────────────────────────────────────────────────────
export function ProductosLanding() {
  return (
    <>
      <ProductosHero />
      <Problema />
      <ComoFunciona />
      <DondeVender />
      <Numeros />
      <Plans />
      <Faq />
      <CtaFinal />
    </>
  );
}
