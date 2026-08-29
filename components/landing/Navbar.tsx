"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Package, HelpCircle, CreditCard, LogIn } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSectionNav } from "@/components/landing/useSectionNav";
import { LocaleToggle } from "@/components/i18n/LocaleToggle";

// El navbar quedó reducido a 3 vistas de la landing larga
// (ProductosLanding) + "Iniciar sesión". Producto / Preguntas frecuentes /
// Planes no son rutas: son secciones (ids 'productos' / 'faq' / 'planes'),
// la navegación la resuelve useSectionNav (scroll suave si ya estamos en
// la landing, si no /productos#<id>). Se eliminaron Sobre nosotros y
// Contáctanos (y sus páginas placeholder) — ese contenido vive hoy en la
// landing.
const SECTION_ITEMS = [
  { key: "product", id: "productos", icon: Package },
  { key: "faq", id: "faq", icon: HelpCircle },
  { key: "plans", id: "planes", icon: CreditCard },
] as const;

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("nav");
  const goToSection = useSectionNav();

  const handleSection = (id: string) => {
    setIsOpen(false);
    goToSection(id);
  };

  return (
    <>
      {/* DESKTOP — mismo corte lg (1024px) que useViewportTier() en
          core/hooks/useQuality.ts, que es quien decide si se monta el
          robot 3D o la intro cinemática. Deben moverse juntos.

          Barra horizontal fija ARRIBA (pedido explícito del usuario:
          "como Vercel/Linear/ElevenLabs", no un <aside> lateral fijo que
          le come 260px de ancho a toda página). Altura h-24 (96px) —
          Experience.tsx compensa con `lg:pt-24` en el <main> y cada
          página de marketing con contenido "hero" usa
          `lg:min-h-[calc(100vh-6rem)]` para seguir centrando su
          contenido respecto al alto real que queda debajo de la barra,
          no respecto al viewport completo. Mismo tratamiento visual que
          antes (texto/íconos/hover, sin fondo propio — se ve el fondo
          3D detrás, igual que la barra mobile de acá abajo), solo
          reacomodado de columna a fila. */}

      <div className="hidden lg:flex fixed inset-x-0 top-0 h-24 z-50 items-center justify-between px-10 xl:px-16">

        {/* Logo */}
        <Link href="/" className="block">

          <h1 className="aventhra-logo text-[1.9rem] tracking-[0.18em] text-white">
            AVENTHRA
          </h1>

          <p className="mt-2 w-fit max-w-[170px] text-center text-[10px] uppercase tracking-[0.35em] text-white/35 leading-5">
            {t("tagline")}
          </p>

        </Link>

        {/* Navegación por sección + idioma + Iniciar sesión, agrupados a la
            derecha (mismo bloque único que antes, en fila). */}
        <div className="flex items-center gap-8">

          <nav className="flex items-center gap-8">

            {SECTION_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSection(item.id)}
                  className="group flex items-center gap-2 text-[15px] font-light text-white/55 transition-all duration-300 hover:text-white hover:-translate-y-0.5"
                >
                  <Icon
                    size={16}
                    strokeWidth={1.5}
                    className="text-white/35 transition-colors duration-300 group-hover:text-white/70"
                  />
                  {t(item.key)}
                </button>
              );
            })}

          </nav>

          <LocaleToggle />

          <Link
            href="/login"
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-white/75 transition-all duration-300 hover:border-white/30 hover:bg-white/5 hover:text-white"
          >
            <LogIn
              size={15}
              strokeWidth={1.5}
              className="text-white/50 transition-colors duration-300 group-hover:text-white"
            />
            {t("login")}
          </Link>

        </div>

      </div>

      {/* MOBILE + TABLET (comparten el mismo navbar por debajo de lg) */}

      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50">

        {/* Grid de 3 columnas (1fr auto 1fr) en vez de justify-between:
            así el logo queda REALMENTE centrado en la barra (columna del
            medio), y el botón hamburguesa cae en la columna derecha con
            justify-self-end — al ser del mismo ancho (1fr) que la columna
            izquierda (vacía, solo de balance), termina en el mismo pixel
            donde ya estaba con justify-between (pegado al borde derecho).
            El botón se queda EXACTO donde está — solo cambió a dónde abre
            el panel (ver bottom sheet más abajo), no su propia posición. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-5">

          <div aria-hidden />

          {/* El wordmark "AVENTHRA" de esta barra YA NO es texto CSS — es
              el modelo 3D real (aventhra-wordmark-cables.glb) que vive en
              MobileSceneContainer.tsx, montado como fondo persistente en
              Experience.tsx y encuadrado para asentarse cerca de este
              mismo lugar en pantalla (EXPERIENCE_CONFIG.mobileWordmark.
              restPosition). Acá solo queda un tap-target invisible del
              mismo tamaño aproximado, para no perder el "tocar el logo
              para ir al inicio" ni la accesibilidad (el modelo 3D no es
              un <a>, no se puede tabular/leer con lector de pantalla). */}
          <Link
            href="/"
            aria-label="AVENTHRA — inicio"
            className="justify-self-center block h-9 w-28"
          />

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="justify-self-end"
            aria-label={isOpen ? t("closeMenu") : t("openMenu")}
          >
            {/* Siempre el ícono de hamburguesa, abierto o cerrado — pedido
                explícito del usuario (antes cambiaba a X al abrir). */}
            <Menu className="text-white" size={22} />
          </button>

        </div>

      </nav>

      {/* Panel del menú — REHECHO tras feedback: descartado el bottom
          sheet que crecía verticalmente (y:"100%"→0, con backdrop) —
          ese movimiento de "todo el panel deslizándose" no gustó. En su
          lugar: una fila horizontal fija abajo (como una tab bar), con
          los 3 items en orden fijo izquierda→derecha (Sobre nosotros |
          Contáctanos | Iniciar sesión), ícono arriba + texto chico abajo
          en vez de texto grande. Sin backdrop de pantalla completa: al
          ser una barra angosta y no una hoja que tapa contenido, no hace
          falta oscurecer todo detrás (se cierra con el mismo botón —
          siempre ícono de hamburguesa, no cambia a X — o tocando un link).
          Entrada: la barra en sí solo hace fundido (sin desplazamiento
          vertical, para no repetir justo lo que no gustó) — el
          movimiento real vive en cada item por separado, apareciendo en
          su lugar (fade + scale) en cascada izquierda→derecha
          (staggerChildren), mismo lenguaje que ya se usaba. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="menu-bar"
            // Sin fondo propio a propósito — el usuario lo pidió transparente
            // para que se vea el fondo de estrellas persistente (Deep-
            // SpaceStars, vía MobileSceneContainer/MobileWordmarkScene)
            // por debajo, no solo en los huecos entre items. Tampoco borde
            // superior (se pidió quitar esa línea también).
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >

            <motion.div
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
              }}
              initial="hidden"
              animate="visible"
              className="pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >

              {/* Fila propia para el toggle de idioma, centrada arriba del
                  grid de accesos. */}
              <motion.div
                variants={{ hidden: { opacity: 0, scale: 0.6 }, visible: { opacity: 1, scale: 1 } }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="mb-3 flex justify-center"
              >
                <LocaleToggle className="text-sm" />
              </motion.div>

              {/* 3 secciones de la landing + Iniciar sesión, en una fila. */}
              <div className="grid grid-cols-4">
                {SECTION_ITEMS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.key}
                      variants={{ hidden: { opacity: 0, scale: 0.6 }, visible: { opacity: 1, scale: 1 } }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="flex justify-center"
                    >
                      <button
                        type="button"
                        onClick={() => handleSection(item.id)}
                        className="flex flex-col items-center gap-1.5 px-2 py-1 text-white/70 transition-colors hover:text-white"
                      >
                        <Icon size={20} strokeWidth={1.5} />
                        <span className="text-center text-[11px] font-light leading-tight tracking-wide">{t(item.key)}</span>
                      </button>
                    </motion.div>
                  );
                })}

                <motion.div
                  variants={{ hidden: { opacity: 0, scale: 0.6 }, visible: { opacity: 1, scale: 1 } }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex justify-center"
                >
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex flex-col items-center gap-1.5 px-2 py-1 text-white/70 transition-colors hover:text-white"
                  >
                    <LogIn size={20} strokeWidth={1.5} />
                    <span className="text-[11px] font-light tracking-wide">{t("login")}</span>
                  </Link>
                </motion.div>
              </div>

            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .aventhra-logo {
          font-family: var(--font-space-grotesk), sans-serif;
          font-weight: 500;
        }
      `}</style>

    </>
  );
};