// app/(dashboard)/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/get-session';
import { getAvatarUrl } from '@/lib/services/profileService';
import { DashboardShell } from '@/components/dashboard/shared/DashboardShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'admin') redirect('/login');

  const avatarUrl = await getAvatarUrl(profile.userId, profile.businessId);

  return (
    <DashboardShell role="admin" userName={profile.fullName} avatarUrl={avatarUrl}>
      {children}
    </DashboardShell>
  );
}