// components/landing/Plans.tsx
//
// Sección de planes de la landing. VISUAL — el CTA todavía lleva a
// /contacto ("Solicitar acceso"); cuando se integre Wompi pasa a ser el
// flujo de pago real.
//
// Precios de lanzamiento (USD) y créditos según docs/pricing-model.md
// (propuesta v2, 2026-08-28). Toggle mensual/anual: el plan anual se paga
// 10 meses y se usan 12 (≈17% off). Los créditos del plan NO se acumulan
// de un mes al otro.
//
// El plan recomendado (Crecimiento) lleva el borde de degradado que gira
// (OrbitFrame) — el mismo efecto del botón "Iniciar sesión" — en la card y
// en su CTA. Solo alrededor: sin resplandor hacia adentro.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, MessageCircle, TrendingUp, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { OrbitFrame } from '@/components/landing/OrbitFrame';

interface Plan {
  name: string;
  tagline: string;
  Icon: LucideIcon;
  /** Precio mensual en USD (facturación mes a mes). */
  monthlyPrice: number;
  /** Precio anual total en USD (= monthlyPrice × 10). */
  annualPrice: number;
  credits: string;
  creditsNote: string;
  features: string[];
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Atención',
    tagline: 'El agente que responde y vende por ti.',
    Icon: MessageCircle,
    monthlyPrice: 39,
    annualPrice: 390,
    credits: '3.000 créditos / mes',
    creditsNote: '≈ 200 conversaciones con tus clientes',
    features: [
      '1 negocio vinculado',
      'Agente 24/7 en WhatsApp e Instagram',
      'Responde, recomienda y toma pedidos',
      'Catálogo, precios y reglas configurables',
      'Nunca inventa: responde solo con tu información',
    ],
  },
  {
    name: 'Crecimiento',
    tagline: 'Atención + marketing que trae clientes.',
    Icon: TrendingUp,
    highlighted: true,
    monthlyPrice: 99,
    annualPrice: 990,
    credits: '9.000 créditos / mes',
    creditsNote: '≈ 600 conversaciones o 20 campañas completas',
    features: [
      'Todo lo de Atención',
      '1 negocio vinculado',
      'Estrategia de marketing para tu negocio',
      'Copys e imágenes generados con IA',
      'Publicación orgánica en tus redes',
    ],
  },
  {
    name: 'Escala',
    tagline: 'El embudo completo, anuncios incluidos.',
    Icon: Rocket,
    monthlyPrice: 249,
    annualPrice: 2490,
    credits: '25.000 créditos / mes',
    creditsNote: 'para operar varios negocios a la vez',
    features: [
      'Todo lo de Crecimiento',
      '3 negocios vinculados',
      'Anuncios en Meta, Google y TikTok Ads',
      'Imágenes en HD',
      'Cola de IA prioritaria + reportes por canal',
    ],
  },
];

/** Precio mensual mostrado: mensual directo, o el equivalente/mes del anual. */
function monthlyDisplay(plan: Plan, annual: boolean): string {
  const value = annual ? plan.annualPrice / 12 : plan.monthlyPrice;
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(1)}`;
}

function PlanBody({ plan, annual }: { plan: Plan; annual: boolean }) {
  const { Icon } = plan;
  return (
    <div className="flex h-full flex-col p-7 md:p-8">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
          plan.highlighted
            ? 'border-white/15 bg-white/[0.06]'
            : 'border-white/[0.08] bg-white/[0.04]'
        }`}
      >
        <Icon
          size={20}
          className={plan.highlighted ? 'text-[#818CF8]' : 'text-white/70'}
        />
      </span>

      <h3
        className={`nexora-headline mt-5 text-xl font-semibold ${
          plan.highlighted ? 'aventhra-iridescent' : 'text-white'
        }`}
      >
        {plan.name}
      </h3>
      <p className="aventhra-copy mt-2 text-sm text-white/45">{plan.tagline}</p>

      {/* Precio */}
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="nexora-headline text-4xl font-semibold text-white">
          {monthlyDisplay(plan, annual)}
        </span>
        <span className="text-sm text-white/40">/ mes</span>
      </div>
      <p className="mt-1 text-xs text-white/35">
        {annual
          ? `$${plan.annualPrice} al año · 2 meses gratis`
          : `o $${plan.annualPrice} al año (2 meses gratis)`}
      </p>

      {/* Créditos incluidos */}
      <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
        <p className="aventhra-iridescent nexora-headline text-base font-semibold">
          {plan.credits}
        </p>
        <p className="mt-0.5 text-xs text-white/40">{plan.creditsNote}</p>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li
            key={f}
            className="flex gap-3 text-sm leading-relaxed text-white/70"
          >
            <Check size={16} className="mt-0.5 shrink-0 text-[#4CC2E8]" />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex justify-center">
        {plan.highlighted ? (
          <OrbitFrame
            className="inline-block rounded-full"
            innerClassName="rounded-full bg-[#0b0b0f]"
            ringSize="h-[280px] w-[280px]"
          >
            <Link
              href="/contacto"
              className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              Solicitar acceso
            </Link>
          </OrbitFrame>
        ) : (
          <Link
            href="/contacto"
            className="rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            Solicitar acceso
          </Link>
        )}
      </div>
    </div>
  );
}

export function Plans() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="relative w-full px-6 py-24 md:px-10 md:py-28 lg:px-16 lg:py-36">
      <h2 className="nexora-headline mx-auto max-w-3xl text-center text-3xl font-normal leading-[1.15] tracking-tight text-white md:text-4xl lg:text-5xl">
        Elige el plan que llevará tu negocio a{' '}
        <span className="aventhra-iridescent">otro nivel</span>
      </h2>
      <p className="aventhra-copy mx-auto mt-5 max-w-xl text-center text-white/45">
        Todo funciona con créditos: cada respuesta del agente, cada copy, cada
        imagen. Empieza por donde lo necesites y sube cuando quieras.
      </p>

      {/* Toggle mensual / anual */}
      <div className="mt-10 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              !annual ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${
              annual ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Anual
            <span className="rounded-full bg-[linear-gradient(120deg,#4CC2E8,#A78BFA)] px-2 py-0.5 text-[10px] font-medium text-black">
              −17%
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl items-start gap-5 lg:grid-cols-3">
        {PLANS.map((plan) =>
          plan.highlighted ? (
            <div key={plan.name} className="relative lg:-translate-y-3">
              <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[linear-gradient(120deg,#4CC2E8,#A78BFA)] px-3 py-1 text-[11px] font-medium text-black">
                Más popular
              </span>
              <OrbitFrame
                className="block w-full rounded-2xl"
                innerClassName="rounded-[15px] bg-[#0b0b0f]"
                ringSize="h-[880px] w-[880px]"
                spinDuration="3s"
              >
                <PlanBody plan={plan} annual={annual} />
              </OrbitFrame>
            </div>
          ) : (
            <div
              key={plan.name}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03]"
            >
              <PlanBody plan={plan} annual={annual} />
            </div>
          )
        )}
      </div>

      <p className="mx-auto mt-10 max-w-lg text-center text-xs text-white/30">
        Precios de lanzamiento en USD. Los créditos incluidos se renuevan cada
        mes y lo que no uses no se acumula. Si se te acaban, puedes comprar packs
        extra en cualquier momento.
      </p>
    </section>
  );
}
