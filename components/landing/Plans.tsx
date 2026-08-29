// components/landing/Plans.tsx
//
// Sección de planes de la landing. El CTA de cada plan inicia el pago:
// llama a `startCheckout` (app/actions/checkout.ts), que crea la fila
// `checkout_sessions` y redirige al Web Checkout de Wompi. El alta de la
// cuenta la dispara el webhook (app/api/webhooks/wompi) cuando el pago
// queda aprobado — no hay signup previo.
//
// Modelo v5 (docs/pricing-model.md §12): cada plan trae CUPOS mensuales
// (conversaciones del agente, campañas, imágenes) + un colchón de créditos
// para pasarse del cupo. Nada se acumula de un mes al otro.
// Toggle mensual/anual: el anual se paga 10 meses (2 gratis).
//
// El plan recomendado (Crecimiento) lleva el borde de degradado que gira
// (OrbitFrame) en la card y en su CTA.
//
// TEXTO: todo el copy vive en messages/<locale>.json bajo `landing.plans`
// (útil para ES/EN). Acá solo quedan los DATOS que no se traducen: precio,
// ícono y cuál es el plan destacado. El orden del array PLAN_META debe
// coincidir con el de `landing.plans.items`.
'use client';

import { useActionState, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, MessageCircle, TrendingUp, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { OrbitFrame } from '@/components/landing/OrbitFrame';
import { startCheckout } from '@/app/actions/checkout';

interface PlanMeta {
  Icon: LucideIcon;
  /** `plans.key` en la base — lo que recibe el checkout de Wompi. */
  planKey: string;
  /** Precio mensual en USD (facturación mes a mes). */
  monthlyPrice: number;
  /** Precio anual total en USD (= monthlyPrice × 10). */
  annualPrice: number;
  highlighted?: boolean;
}

/** Texto de un plan, tal como viene de `landing.plans.items[i]`. */
interface PlanCopy {
  name: string;
  tagline: string;
  included: string[];
  overflowNote: string;
  features: string[];
}

// El orden coincide con `landing.plans.items` en messages/<locale>.json y
// con `plans.sort_order` en la base.
const PLAN_META: PlanMeta[] = [
  { Icon: MessageCircle, planKey: 'atencion', monthlyPrice: 39, annualPrice: 390 },
  { Icon: TrendingUp, planKey: 'crecimiento', monthlyPrice: 99, annualPrice: 990, highlighted: true },
  { Icon: Rocket, planKey: 'escala', monthlyPrice: 249, annualPrice: 2490 },
];

const NUMBER_LOCALE: Record<string, string> = { es: 'es-CO', en: 'en-US' };

function PlanBody({
  meta,
  copy,
  annual,
}: {
  meta: PlanMeta;
  copy: PlanCopy;
  annual: boolean;
}) {
  const t = useTranslations('landing.plans');
  const locale = useLocale();
  const nf = NUMBER_LOCALE[locale] ?? 'es-CO';
  const { Icon } = meta;

  const [checkoutState, checkoutAction, checkoutPending] = useActionState(startCheckout, null);

  const fmt = (n: number) => `$${n.toLocaleString(nf)}`;

  return (
    <div className="flex h-full w-full flex-col p-7 md:p-8">
      {/* Logo y título centrados; el resto de la card alineado a la izquierda. */}
      <span
        className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl border ${
          meta.highlighted
            ? 'border-white/15 bg-white/[0.06]'
            : 'border-white/[0.08] bg-white/[0.04]'
        }`}
      >
        <Icon
          size={20}
          className={meta.highlighted ? 'text-[#818CF8]' : 'text-white/70'}
        />
      </span>

      <h3
        className={`nexora-headline mt-5 text-center text-xl font-semibold ${
          meta.highlighted ? 'aventhra-iridescent' : 'text-white'
        }`}
      >
        {copy.name}
      </h3>
      <p className="aventhra-copy mt-2 text-sm text-white/45">{copy.tagline}</p>

      {/* Precio. En anual, el precio "de lista" (×12) va encima, tachado. */}
      {annual && (
        <p className="mt-6 text-sm text-white/25 line-through">
          {fmt(meta.monthlyPrice * 12)}
        </p>
      )}
      <div className={`${annual ? 'mt-1' : 'mt-6'} flex items-baseline gap-2`}>
        <span className="nexora-headline text-4xl font-semibold text-white">
          {annual ? fmt(meta.annualPrice) : fmt(meta.monthlyPrice)}
        </span>
        <span className="text-sm text-white/40">
          {annual ? t('perYear') : t('perMonth')}
        </span>
      </div>
      <p className="mt-1 text-xs text-white/35">
        {annual
          ? t('annualSavingNote', {
              saved: fmt(meta.monthlyPrice * 12 - meta.annualPrice),
            })
          : t('monthlyAltNote', { annual: fmt(meta.annualPrice) })}
      </p>

      {/* Cupos + qué incluye, todo en una sola lista (sin card interna). */}
      <ul className="mt-6 flex-1 space-y-3">
        {[...copy.included, t('creditsOption'), ...copy.features].map((line) => (
          <li key={line} className="flex gap-3 text-sm leading-relaxed text-white/70">
            <Check size={16} className="mt-0.5 shrink-0 text-[#4CC2E8]" />
            {line}
          </li>
        ))}
      </ul>

      <form action={checkoutAction} className="mt-8 flex flex-col items-center gap-2">
        <input type="hidden" name="planKey" value={meta.planKey} />
        <input type="hidden" name="billingPeriod" value={annual ? 'annual' : 'monthly'} />
        <CheckoutSubmit
          label={t('ctaButton')}
          loadingLabel={t('ctaLoading')}
          highlighted={meta.highlighted}
          pending={checkoutPending}
        />
        {checkoutState?.error && (
          <p className="mt-1 text-xs text-red-400">{checkoutState.error}</p>
        )}
      </form>
    </div>
  );
}

// Botón de compra. `pending` viene del useActionState del plan: mientras
// el server action crea la sesión y redirige a Wompi, muestra el estado
// de carga.
function CheckoutSubmit({
  label,
  loadingLabel,
  highlighted,
  pending,
}: {
  label: string;
  loadingLabel: string;
  highlighted?: boolean;
  pending: boolean;
}) {
  const text = pending ? loadingLabel : label;

  if (highlighted) {
    return (
      <OrbitFrame
        className="inline-block rounded-full"
        innerClassName="rounded-full bg-[#0b0b0f]"
        ringSize="h-[280px] w-[280px]"
      >
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-white/80 transition-colors hover:text-white disabled:opacity-60"
        >
          {text}
        </button>
      </OrbitFrame>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
    >
      {text}
    </button>
  );
}

export function Plans() {
  const t = useTranslations('landing.plans');
  const [annual, setAnnual] = useState(false);

  const items = t.raw('items') as PlanCopy[];
  const plans = PLAN_META.map((meta, i) => ({ meta, copy: items[i] }));

  return (
    <section
      id="planes"
      className="relative w-full scroll-mt-24 px-6 py-24 md:px-10 md:py-28 lg:px-16 lg:py-36"
    >
      <h2 className="nexora-headline mx-auto max-w-3xl text-center text-3xl font-normal leading-[1.15] tracking-tight text-white md:text-4xl lg:text-5xl">
        {t.rich('title', {
          hl: (chunks) => <span className="aventhra-iridescent">{chunks}</span>,
        })}
      </h2>
      <p className="aventhra-copy mx-auto mt-5 max-w-xl text-center text-white/45">
        {t('lead')}
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
            {t('toggleMonthly')}
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${
              annual ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t('toggleAnnual')}
            <span className="rounded-full bg-[linear-gradient(120deg,#4CC2E8,#A78BFA)] px-2 py-0.5 text-[10px] font-medium text-black">
              {t('toggleBadge')}
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl items-stretch gap-5 lg:grid-cols-3">
        {plans.map(({ meta, copy }) =>
          meta.highlighted ? (
            <div key={copy.name} className="relative h-full lg:-translate-y-3">
              <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[linear-gradient(120deg,#4CC2E8,#A78BFA)] px-3 py-1 text-[11px] font-medium text-black">
                {t('popularBadge')}
              </span>
              <OrbitFrame
                className="block h-full w-full rounded-2xl"
                innerClassName="h-full rounded-[15px] bg-[#0b0b0f]"
                ringSize="h-[880px] w-[880px]"
                spinDuration="3s"
              >
                <PlanBody meta={meta} copy={copy} annual={annual} />
              </OrbitFrame>
            </div>
          ) : (
            <div
              key={copy.name}
              className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.03]"
            >
              <PlanBody meta={meta} copy={copy} annual={annual} />
            </div>
          )
        )}
      </div>

      <p className="mx-auto mt-10 max-w-lg text-center text-xs text-white/30">
        {t('footerNote')}
      </p>
    </section>
  );
}
