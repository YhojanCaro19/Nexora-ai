import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// i18n (next-intl) en modo SIN rutas de idioma — el locale vive en la
// cookie `LOCALE`, la config por-request está en i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Cabeceras de seguridad para TODAS las respuestas. No es un CSP completo
// (script-src) — eso necesita una pasada dedicada por el 3D, Supabase,
// Google y Wompi para no romper nada — pero sí lo barato y de alto valor:
// no embebible en un iframe (clickjacking), sin sniffing de MIME, HSTS,
// Referrer acotado y APIs del navegador (cámara/mic/geo) denegadas.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  turbopack: {
    root: process.cwd(), // SOLUCIÓN AL ERROR DE LOCKFILES
  },
  experimental: {
    serverActions: {
      // Default de Next.js es 1MB — una foto de celular sin comprimir ya
      // lo supera antes de que el código llegue a sanitizeImageUpload()
      // (imageSecurityService.ts), que sí valida/comprime pero nunca
      // llega a correr si el body se rechaza antes. 8mb da margen sobre
      // el límite más grande que ya se valida ahí (5MB, fotos de
      // producto) más el overhead de la codificación de la Server Action.
      bodySizeLimit: "8mb",
    },
  },
};

export default withNextIntl(nextConfig);