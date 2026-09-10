// app/(dashboard)/colaborador/page.tsx
//
// El Inicio del colaborador muestra el MISMO tablero del negocio que ve el
// admin (mismos KPIs de hoy, reservas del día, gráficas y estado general).
import { getSessionProfile } from '@/lib/auth/get-session';
import { HomeDashboard } from '@/app/(dashboard)/admin/home-dashboard';

export default async function ColaboradorHomePage() {
  const profile = await getSessionProfile();
  return <HomeDashboard businessId={profile?.businessId ?? null} />;
}
