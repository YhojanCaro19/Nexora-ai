// app/(dashboard)/superadmin/consumo/page.tsx
import { getAgentUsageByBusiness } from "@/lib/services/agentUsageService";
import { ConsumptionPanel } from "./consumption-panel";

export default async function ConsumoPage() {
  const usage = await getAgentUsageByBusiness();

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Consumo del agente
      </h1>

      {usage.length === 0 ? (
        // Server Component: mismo motivo que en negocios/reportes — no se
        // le puede pasar un ícono de lucide a un Client Component como prop.
        <p className="text-sm text-center py-16" style={{ color: 'var(--nexora-ink-dim)' }}>
          Acá vas a ver cuántos tokens consume el agente de cada negocio, apenas empiecen a
          registrarse conversaciones reales.
        </p>
      ) : (
        <ConsumptionPanel usage={usage} />
      )}
    </div>
  );
}
