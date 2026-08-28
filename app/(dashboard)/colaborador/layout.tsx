// app/(dashboard)/colaborador/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/get-session';
import { getAvatarUrl } from '@/lib/services/profileService';
import { DashboardShell } from '@/components/dashboard/shared/DashboardShell';

export default async function ColaboradorLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'colaborador') redirect('/login');

  const avatarUrl = await getAvatarUrl(profile.userId, profile.businessId);

  return (
    <DashboardShell
      role="colaborador"
      userName={profile.fullName}
      permissions={profile.permissions}
      avatarUrl={avatarUrl}
    >
      {children}
    </DashboardShell>
  );
}