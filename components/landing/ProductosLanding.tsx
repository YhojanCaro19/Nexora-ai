// components/landing/ProductosLanding.tsx
//
// Landing completa de "Productos" / Pantalla 2. AVENTHRA como embudo
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
'use client';

import { Fragment } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { ProductosHero } from '@/components/landing/ProductosHero';
import { OrbitButton } from '@/components/landing/OrbitButton';
import { Counter } from '@/components/landing/Counter';
import { Plans } from '@/components/landing/Plans';
import {
  WhatsAppGlyph,
  InstagramGlyph,
  FacebookGlyph,
  TikTokGlyph,
  MetaGlyph,
  GoogleGlyph,
} from '@/components/landing/BrandGlyphs';

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

// ── 1. El problema ───────────────────────────────────────────────────────
function Problema() {
  const cards = [
    {
      stat: <Counter to={3000} prefix="US$" />,
      label: 'es lo que cobra al mes una agencia de marketing digital',
      headline: 'Inviertes y sigues sin vender',
      body: 'Pagar gente que responda tus redes y aparte una agencia sale caro. Y los primeros resultados llegan en meses, no en días.',
      source: {
        href: 'https://www.webfx.com/blog/marketing/marketing-agency-cost/',
        label: 'WebFX — Marketing Agency Cost',
      },
    },
    {
      stat: <Counter to={70} suffix="%" />,
      label:
        'de los dueños de negocio le dedican menos de 5 horas por semana al marketing',
      headline: 'No es que no quieras. No te alcanza el tiempo.',
      body: 'Lo reconocen como su mayor motor de crecimiento, pero están vendiendo, atendiendo y operando al mismo tiempo.',
      source: {
        href: 'https://investors.fiverr.com/news-releases/news-release-details/fiverr-small-business-month-survey-marketing-seen-key-growth',
        label: 'Fiverr, encuesta 2025 (≈6.000 negocios)',
      },
    },
    {
      stat: <Counter to={78} suffix="%" />,
      label:
        'de los clientes le compra al primer negocio que le responde',
      headline: 'Y además hay que contestar rápido',
      body: 'Si respondes al día siguiente ya es tarde: para entonces la persona compró en otro lado.',
      source: {
        href: 'https://hbr.org/2011/03/the-short-life-of-online-sales-leads',
        label: 'Harvard Business Review',
      },
    },
  ];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>
        Tú quieres vender, no tener un equipo gigante{' '}
        <span className="aventhra-iridescent">quitándote tus ganancias</span>
      </h2>
      <p className={LEAD}>
        Tener gente que responda tus redes y pagar una agencia para que te
        consiga clientes es caro y lento. Y aun así, la venta se pierde por no
        responder a tiempo.
      </p>

      <div className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.source.label}
            className={`${CARD} flex flex-col items-center text-center`}
          >
            <p className={`${STAT_NUMBER} text-4xl md:text-5xl`}>{c.stat}</p>
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
                href={c.source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white/20 underline underline-offset-2 transition-colors hover:text-white/45"
              >
                {c.source.label}
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
  const steps = [
    {
      n: '01',
      title: 'Conectas tus redes',
      body: 'WhatsApp, Instagram, Facebook y TikTok. En minutos, sin instalar nada.',
    },
    {
      n: '02',
      title: 'AVENTHRA arma tu plan',
      body: 'A quién venderle, en qué red y con qué mensaje. Para tu caso, no una plantilla.',
    },
    {
      n: '03',
      title: 'Te entrega los anuncios',
      body: 'Textos e imágenes de cada publicación y cada anuncio. Tú apruebas los que te gusten.',
    },
    {
      n: '04',
      title: 'Publica y pone la pauta',
      body: 'Sube el contenido y lanza los anuncios en Meta, Google y TikTok. Un solo panel.',
    },
    {
      n: '05',
      title: 'Responde y vende',
      body: 'El agente contesta cada mensaje, recomienda productos y cierra el pedido. A toda hora.',
    },
  ];

  return (
    <section className={SECTION}>
      <div className="flex flex-col items-center">
        <span className="h-px w-16 bg-gradient-to-r from-transparent via-[#818CF8] to-transparent" />
        <p className="aventhra-iridescent nexora-headline mt-4 text-xs font-semibold uppercase tracking-[0.32em]">
          Marketing + atención, un solo sistema
        </p>
      </div>
      <h2 className={`${TITLE} mt-5`}>
        De la estrategia a la venta,{' '}
        <span className="aventhra-iridescent">sin agencia</span>
      </h2>
      <p className={LEAD}>
        Tú decides qué vendes y cómo quieres que el agente les hable a tus
        clientes. AVENTHRA arma el resto y te lo pone a aprobar.
      </p>

      {/* Mapa de proceso: 01 → 02 → 03 → … En desktop fluye a la derecha;
          en mobile se apila y la flecha apunta hacia abajo. */}
      <ol className="mx-auto mt-16 flex max-w-6xl flex-col items-stretch gap-2 lg:flex-row">
        {steps.map((s, i) => (
          <Fragment key={s.n}>
            <li className="flex flex-1 flex-col items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-center backdrop-blur-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                <span className="aventhra-iridescent nexora-headline text-sm font-semibold">
                  {s.n}
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
  const redes = [
    { name: 'WhatsApp', Glyph: WhatsAppGlyph },
    { name: 'Instagram', Glyph: InstagramGlyph },
    { name: 'Facebook', Glyph: FacebookGlyph },
    { name: 'TikTok', Glyph: TikTokGlyph },
  ];
  const ads = [
    {
      name: 'Meta Ads',
      Glyph: MetaGlyph,
      body: 'Llega a más de 3 mil millones de personas en Facebook e Instagram. Segmentación por intereses, comportamiento y audiencias similares.',
    },
    {
      name: 'Google Ads',
      Glyph: GoogleGlyph,
      body: 'Aparece justo cuando te buscan. Búsqueda, display y YouTube para capturar demanda activa.',
    },
    {
      name: 'TikTok Ads',
      Glyph: TikTokGlyph,
      body: 'Conecta con la generación que más compra online. Videos que se sienten nativos y generan engagement real.',
    },
  ];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>
        Tú decides <span className="aventhra-iridescent">dónde vender</span>
      </h2>
      <p className={LEAD}>
        Conecta los canales que ya usas. AVENTHRA publica, pauta y responde en
        todos, desde el mismo panel.
      </p>

      <div className="mx-auto mt-14 flex max-w-2xl flex-wrap items-start justify-center gap-x-12 gap-y-8">
        {redes.map(({ name, Glyph }) => (
          <div key={name} className="flex w-20 flex-col items-center gap-3">
            <Glyph className="h-9 w-9" />
            <span className="text-xs text-white/60">{name}</span>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
        {ads.map(({ name, Glyph, body }) => (
          <div
            key={name}
            className={`${CARD} flex flex-col items-center text-center`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05]">
              <Glyph className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-lg font-medium text-white">{name}</h3>
            <p className="aventhra-copy mt-3 max-w-xs text-sm leading-relaxed text-white/45">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 4. Los números ───────────────────────────────────────────────────────
function Numeros() {
  const stats = [
    {
      value: <>US$4,52</>,
      label:
        'de ingreso por cada US$1 invertido en anuncios con la IA de Meta — un 22% más que una campaña configurada a mano',
    },
    {
      value: (
        <>
          <Counter to={32} suffix="%" />
        </>
      ),
      label:
        'más retorno de la inversión con campañas de compras con IA que configurando los anuncios manualmente',
    },
    {
      value: (
        <>
          <Counter to={11} suffix="%" />
        </>
      ),
      label: 'más clics cuando la imagen del anuncio la genera la IA',
    },
    {
      value: (
        <>
          <Counter to={21} suffix="×" />
        </>
      ),
      label:
        'más probabilidad de calificar un lead si respondes en 5 minutos en vez de 30',
    },
  ];

  return (
    <section className={SECTION}>
      <h2 className={TITLE}>
        ¿Y si pudieras vender más{' '}
        <span className="aventhra-iridescent">sin contratar a nadie</span>?
      </h2>
      <p className={LEAD}>
        Los números de la IA aplicada a marketing y atención:
      </p>

      <div className="mx-auto mt-14 grid max-w-3xl gap-x-10 gap-y-12 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center text-center">
            <p className={`${STAT_NUMBER} text-6xl md:text-7xl`}>{s.value}</p>
            <p className="aventhra-copy mt-4 max-w-xs text-sm leading-relaxed text-white/45">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-14 max-w-md text-center text-[11px] text-white/20">
        Datos de Meta (pruebas A/B a gran escala) y Harvard Business Review.
      </p>
    </section>
  );
}

// ── 6. Preguntas frecuentes ──────────────────────────────────────────────
function Faq() {
  const items = [
    {
      q: '¿Qué es AVENTHRA?',
      a: 'Un empleado virtual que atrae clientes y los atiende. Por un lado hace tu marketing (estrategia, contenido y anuncios); por el otro, un agente responde tus mensajes por WhatsApp e Instagram y cierra la venta.',
    },
    {
      q: '¿La parte de marketing ya está disponible?',
      a: 'La estamos activando negocio por negocio mientras la terminamos de pulir. El agente de atención sí está listo. Escríbenos y te decimos en qué punto estás.',
    },
    {
      q: '¿En qué canales trabaja?',
      a: 'Atención por WhatsApp e Instagram. Publicación en WhatsApp, Instagram, Facebook y TikTok. Anuncios en Meta Ads, Google Ads y TikTok Ads.',
    },
    {
      q: '¿Necesito saber de marketing o de tecnología?',
      a: 'No. Le dices en español qué vendes, a quién y cómo quieres que hable. El resto lo arma AVENTHRA y tú apruebas.',
    },
    {
      q: '¿El agente puede inventarse cosas?',
      a: 'No responde nada fuera de la información que tú cargaste. Si no sabe algo, lo dice y te avisa.',
    },
    {
      q: '¿Reemplaza a mi agencia?',
      a: 'Para la mayoría de negocios pequeños, sí: cubre estrategia, contenido, pauta y atención. Si trabajas con una agencia, AVENTHRA le quita de encima el trabajo repetitivo.',
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

// ── 7. CTA final ─────────────────────────────────────────────────────────
function CtaFinal() {
  return (
    <section className={`${SECTION} pb-40`}>
      <h2 className={TITLE}>
        Mientras lo piensas, tu competencia{' '}
        <span className="aventhra-iridescent">ya está vendiendo</span>
      </h2>
      <p className={LEAD}>
        Cada día sin AVENTHRA es dinero que no estás ganando: en clientes que no
        supieron que existes y en mensajes que nadie respondió.
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
      <DondeVender />
      <Numeros />
      <Plans />
      <Faq />
      <CtaFinal />
    </>
  );
}
