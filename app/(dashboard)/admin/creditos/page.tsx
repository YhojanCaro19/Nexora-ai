// app/(dashboard)/admin/creditos/page.tsx
//
// Patrón estándar del dashboard: el layout de /admin ya validó el rol; acá
// solo la consulta de datos (saldo + historial del ledger) y el render.
import { getSessionProfile } from "@/lib/auth/get-session";
import { getCreditBalance, getCreditHistory } from "@/lib/services/creditService";
import { CreditsPanel } from "./credits-panel";

export default async function CreditosPage() {
  const profile = await getSessionProfile();
  if (!profile?.businessId) return null;

  const [balance, history] = await Promise.all([
    getCreditBalance(profile.businessId),
    getCreditHistory(profile.businessId, 50),
  ]);

  return <CreditsPanel balance={balance} history={history} />;
}
