// app/(dashboard)/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/get-session';
import { getAvatarUrl } from '@/lib/services/profileService';
import { getCreditBalance, hasPlanFeature } from '@/lib/services/creditService';
import { DashboardShell } from '@/components/dashboard/shared/DashboardShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'admin') redirect('/login');

  // Negocio recién provisionado (por pago o alta manual) que todavía no
  // pasó por el onboarding del primer login → a /bienvenida. El dueño
  // define ahí nombre/industria/teléfono y se genera el agente.
  if (profile.businessId && !profile.onboardingCompleted) redirect('/bienvenida');

  const [avatarUrl, balance, hasMarketing] = await Promise.all([
    getAvatarUrl(profile.userId, profile.businessId),
    profile.businessId ? getCreditBalance(profile.businessId) : Promise.resolve(null),
    profile.businessId ? hasPlanFeature(profile.businessId, 'marketing') : Promise.resolve(true),
  ]);

  return (
    <DashboardShell
      role="admin"
      userName={profile.fullName}
      avatarUrl={avatarUrl}
      credits={balance?.total ?? null}
      hasMarketing={hasMarketing}
    >
      {children}
    </DashboardShell>
  );
}