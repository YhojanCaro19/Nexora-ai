// app/(dashboard)/superadmin/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/get-session';
import { getAvatarUrl } from '@/lib/services/profileService';
import { DashboardShell } from '@/components/dashboard/shared/DashboardShell';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'superadmin') redirect('/login');
  if (profile.mustChangePassword) redirect('/cambiar-password');

  // Superadmin no tiene business_id (vive en platform_admins, no en
  // business_members) — siempre null, cae al fallback de iniciales.
  const avatarUrl = await getAvatarUrl(profile.userId, profile.businessId);

  return (
    <DashboardShell role="superadmin" userName={profile.fullName} avatarUrl={avatarUrl}>
      {children}
    </DashboardShell>
  );
}