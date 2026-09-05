// app/(dashboard)/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/get-session';
import { getAvatarUrl } from '@/lib/services/profileService';
import { getCreditBalance, hasPlanFeature } from '@/lib/services/creditService';
import { DashboardShell } from '@/components/dashboard/shared/DashboardShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'admin') redirect('/login');

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