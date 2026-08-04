import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: process.cwd(), // SOLUCIÓN AL ERROR DE LOCKFILES
  },
};

export default nextConfig;