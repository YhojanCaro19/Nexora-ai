// app/(dashboard)/admin/marketing/layout.tsx
//
// Gate de plan para todo el módulo de Marketing IA (esta página y todo lo
// que cuelgue de acá: conexiones, nueva estrategia, detalle, biblioteca).
// El plan "Atención" no incluye `marketing` en plans.features — ocultar el
// link del menú (ver getAdminNav) no alcanza, alguien podría escribir la
// URL directo, así que el bloqueo real vive acá, a nivel de ruta.
import Link from "next/link";
import { Lock, ArrowUpCircle } from "lucide-react";
import { getSessionProfile } from "@/lib/auth/get-session";
import { hasPlanFeature } from "@/lib/services/creditService";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile?.businessId) return null;

  const allowed = await hasPlanFeature(profile.businessId, "marketing");
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(129,140,248,0.12)" }}>
          <Lock size={26} style={{ color: "#818CF8" }} />
        </span>
        <h1 className="font-nexora text-2xl" style={{ color: "var(--nexora-ink)" }}>
          Marketing IA no está incluido en tu plan
        </h1>
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          Este módulo (estrategias, creativos con IA y pauta en Meta/Google/TikTok Ads) es parte de los
          planes Crecimiento y Escala. Mejora tu plan para desbloquearlo.
        </p>
        <Link
          href="/admin/creditos"
          className="aventhra-iridescent-bg inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-black"
        >
          <ArrowUpCircle size={16} />
          Ver planes
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
