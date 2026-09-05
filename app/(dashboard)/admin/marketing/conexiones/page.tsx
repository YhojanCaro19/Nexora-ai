// app/(dashboard)/admin/marketing/conexiones/page.tsx
//
// "Marketing → Conexiones" — conectar la cuenta de pauta del propio negocio
// (Meta Ads hoy; Google/TikTok Ads llegan después). El rol ya lo validó el
// layout de /admin. Ver docs/marketing-module-plan.md §8.
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSessionProfile } from "@/lib/auth/get-session";
import { listAdAccountsForBusiness } from "@/lib/services/adAccountService";
import { ConnectAdAccountsSection } from "./connect-ad-accounts-section";

export default async function MarketingConexionesPage() {
  const profile = await getSessionProfile();
  if (!profile?.businessId) return null;

  const connections = await listAdAccountsForBusiness(profile.businessId);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        <ChevronLeft size={16} />
        Mis estrategias
      </Link>

      <div className="text-center">
        <h1 className="font-nexora text-2xl" style={{ color: "var(--nexora-ink)" }}>
          Conexiones
        </h1>
      </div>
      <ConnectAdAccountsSection connections={connections} />
    </div>
  );
}
