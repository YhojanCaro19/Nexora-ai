// components/landing/ProductosLanding.tsx
//
// La landing completa de "Productos" / Pantalla 2: el hero (ProductosHero)
// + todas las secciones de contenido, inspiradas en la estructura de
// saleads.ai pero con el mensaje de AVENTHRA:
//
//   El problema → Cómo funciona → Tu agente nunca inventa → Los números
//   → Preguntas frecuentes → CTA final
//
// Se usa en dos lugares: el Momento 2 del Home (HomeExperience) y la ruta
// /productos. Las estadísticas son reales y llevan su fuente.
'use client';

import { ChevronDown } from 'lucide-react';
import { ProductosHero } from '@/components/landing/ProductosHero';
import { OrbitButton } from '@/components/landing/OrbitButton';
import { Counter } from '@/components/landing/Counter';

// ── helpers de estilo ────────────────────────────────────────────────────
const SECTION = 'relative w-full px-6 py-24 md:px-10 md:py-28 lg:px-16 lg:py-36';
const TITLE =
  'nexora-headline mx-auto max-w-3xl text-center text-3xl font-normal leading-[1.15] tracking-tight text-white md:text-4xl lg:text-5xl';
const LEAD = 'aventhra-copy mx-auto mt-5 max-w-xl text-center text-white/45';
const CARD =
  'rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 backdrop-blur-sm md:p-8';

function Source({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-white/25 underline underline-offset-2 transition-colors hover:text-white/55"
    >
      {children}
    </a>
  );
}

// ── 1. El problema ───────────────────────────────────────────────────────
function Problema() {
  const cards = [
    {
      stat: <><Counter to={78} suffix="%" /></>,
      label: 'le compra al primer negocio que responde',
      body: 'Si tú no contestas primero, contestó tu competencia.',
      source: { href: 'https://hbr.org/2011/03/the-short-life-of-online-sales-leads', label: 'Harvard Business Review' },
    },
    {
      stat: <>US$7.40 <span className="text-white/40">→</span> US$0.62</>,
      label: 'cuesta resolver una consulta: agente humano vs. IA',
      body: 'Contratar, entrenar y pagar turnos para responder lo mismo todo el día sale caro.',
      source: { href: 'https://coworker.ai/blog/ai-customer-service-statistics', label: 'AI Customer Service Stats 2026' },
    },
    {
      stat: <><Counter to={82} suffix="%" /></>,
      label: 'no acepta esperar más de 30 min por WhatsApp',
      body: 'El cliente que te escribe a las 11 p.m. no espera hasta mañana.',
      source: { href: 'https://business.whatsapp.com/resources/resource-library/state-of-business-messaging', label: 'State of Business Messaging' },
    },
  ];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>
        Cada mensaje sin responder es una{' '}
        <span className="aventhra-iridescent">venta que se va</span>
      </h2>
      <p className={LEAD}>
        No es que tus clientes no quieran comprarte. Es que no les respondiste a
        tiempo.
      </p>

      <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className={CARD}>
            <p className="nexora-headline text-3xl font-semibold text-white md:text-4xl">
              {c.stat}
            </p>
            <p className="mt-3 text-sm font-medium text-white/80">{c.label}</p>
            <p className="aventhra-copy mt-4 text-sm leading-relaxed text-white/45">
              {c.body}
            </p>
            <p className="mt-5">
              <Source href={c.source.href}>{c.source.label}</Source>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 2. Cómo funciona ─────────────────────────────────────────────────────
function ComoFunciona() {
  const steps = [
    {
      n: '01',
      title: 'Conecta tu WhatsApp',
      body: 'En minutos, desde el navegador. Sin instalar nada.',
    },
    {
      n: '02',
      title: 'Configura tu agente',
      body: 'Personalidad, catálogo, precios y reglas. Tú decides qué puede decir y qué no.',
    },
    {
      n: '03',
      title: 'Deja que trabaje',
      body: 'Contesta, recomienda, resuelve dudas y toma pedidos — a toda hora.',
    },
  ];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>
        Listo en <span className="aventhra-iridescent">3 pasos</span>
      </h2>
      <p className={LEAD}>
        No necesitas saber de tecnología ni de marketing. Le dices qué vendes y
        cómo quieres que hable.
      </p>

      <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className={CARD}>
            <span className="nexora-headline text-sm font-semibold tracking-widest text-white/30">
              {s.n}
            </span>
            <h3 className="mt-4 text-lg font-medium text-white">{s.title}</h3>
            <p className="aventhra-copy mt-3 text-sm leading-relaxed text-white/45">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 3. Tu agente nunca inventa ───────────────────────────────────────────
function NoInventa() {
  return (
    <section className={SECTION}>
      <h2 className={TITLE}>
        Tu agente <span className="aventhra-iridescent">nunca inventa</span>
      </h2>
      <p className="aventhra-copy mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-white/55 md:text-xl">
        Responde <span className="text-white">solo</span> con lo que tú cargaste:
        tu catálogo, tus precios, tus preguntas frecuentes. Si no sabe algo,{' '}
        <span className="text-white">lo dice</span> y te lo pasa a ti — no se lo
        inventa para salir del paso.
      </p>
      <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-white/35">
        La mayoría de herramientas de IA generan texto que suena bien pero puede
        ser falso. AVENTHRA no.
      </p>
    </section>
  );
}

// ── 4. Los números ───────────────────────────────────────────────────────
function Numeros() {
  const stats = [
    {
      value: <><Counter to={21} suffix="×" /></>,
      label: 'más probabilidad de calificar un lead si respondes en 5 min en vez de 30',
      source: { href: 'https://hbr.org/2011/03/the-short-life-of-online-sales-leads', label: 'HBR, 2011' },
    },
    {
      value: '1 de cada 4',
      label: 'empresas tarda más de 24 horas en responder — o nunca responde',
      source: { href: 'https://hbr.org/2011/03/the-short-life-of-online-sales-leads', label: 'HBR, 2011' },
    },
    {
      value: <><Counter to={64} suffix="%" /></>,
      label: 'dice que la disponibilidad 24/7 es lo más útil de un asistente virtual',
      source: { href: 'https://masterofcode.com/blog/ai-in-customer-service-statistics', label: 'Master of Code, 2026' },
    },
    {
      value: '30–45%',
      label: 'menos tiempo de resolución con un asistente bien configurado',
      source: { href: 'https://masterofcode.com/blog/ai-in-customer-service-statistics', label: 'Master of Code, 2026' },
    },
  ];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>
        Los números detrás de{' '}
        <span className="aventhra-iridescent">responder rápido</span>
      </h2>

      <div className="mx-auto mt-14 grid max-w-4xl gap-x-10 gap-y-12 sm:grid-cols-2">
        {stats.map((s, i) => (
          <div key={i} className="text-center sm:text-left">
            <p className="nexora-headline text-4xl font-semibold text-white md:text-5xl">
              {s.value}
            </p>
            <p className="aventhra-copy mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/45 sm:mx-0">
              {s.label}
            </p>
            <p className="mt-3">
              <Source href={s.source.href}>{s.source.label}</Source>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 5. Preguntas frecuentes ──────────────────────────────────────────────
function Faq() {
  const items = [
    {
      q: '¿Qué es AVENTHRA?',
      a: 'Un empleado virtual que atiende a tus clientes por WhatsApp: contesta, recomienda productos y toma pedidos según las reglas que tú definas.',
    },
    {
      q: '¿Necesito instalar algo?',
      a: 'No. Conectas tu número de WhatsApp y configuras todo desde el panel, en el navegador.',
    },
    {
      q: '¿En qué canales atiende?',
      a: 'Hoy, WhatsApp. Instagram y un widget para tu sitio web están en camino.',
    },
    {
      q: '¿Necesito saber de tecnología o de marketing?',
      a: 'No. Le dices en español qué vendes, a quién y cómo quieres que hable. El resto lo arma AVENTHRA.',
    },
    {
      q: '¿El agente puede inventarse cosas?',
      a: 'No responde nada fuera de la información que tú cargaste. Si no sabe algo, lo dice y te avisa.',
    },
    {
      q: '¿Cómo empiezo?',
      a: 'Escríbenos por Contáctanos. Revisamos tu caso y te damos acceso con tu cuenta.',
    },
  ];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>Preguntas frecuentes</h2>

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

// ── 6. CTA final ─────────────────────────────────────────────────────────
function CtaFinal() {
  return (
    <section className={`${SECTION} pb-40`}>
      <h2 className={TITLE}>
        Mientras lo piensas, tu competencia{' '}
        <span className="aventhra-iridescent">ya está respondiendo</span>
      </h2>
      <p className={LEAD}>
        Cada día sin un agente que atienda es dinero que no estás ganando.
      </p>

      <div className="mt-10 flex flex-col items-center">
        <OrbitButton href="/contacto">Solicitar acceso</OrbitButton>
        <p className="mt-4 text-xs text-white/30">
          Te respondemos rápido — irónicamente.
        </p>
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
      <NoInventa />
      <Numeros />
      <Faq />
      <CtaFinal />
    </>
  );
}
