import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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

export default nextConfig;