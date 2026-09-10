"use client";

// Encabezado de Superadmin → Inicio: fecha + hora de QUIEN mira, en su
// propia zona horaria (la del navegador), no en UTC ni una fija. Además
// escribe la cookie `av_tzoffset` con el offset del navegador para que el
// servidor calcule el "hoy" de los KPIs en esa misma zona
// (ver `todayRange` / `computeTodayStats` en platformStatsService.ts).
//
// SSR: renderiza `fallback` (fecha en America/Bogota, calculada en el
// servidor) hasta montar — así el primer render del cliente coincide con
// el del servidor y no hay salto ni warning de hidratación.
import { useEffect, useState } from "react";

export function LocalNow({ fallback }: { fallback: string }) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    const tick = () => {
      // getTimezoneOffset(): minutos, UTC = hora local + offset.
      document.cookie = `av_tzoffset=${new Date().getTimezoneOffset()}; path=/; max-age=31536000; samesite=lax`;
      const now = new Date();
      const fecha = now.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
      const hora = now.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
      setText(`${fecha} · ${hora}`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }} suppressHydrationWarning>
      {text}
    </p>
  );
}
