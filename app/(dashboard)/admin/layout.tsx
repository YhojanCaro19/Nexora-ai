// app/(dashboard)/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/get-session';
import { DashboardShell } from '@/components/dashboard/shared/DashboardShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'admin') redirect('/login');
  if (profile.mustChangePassword) redirect('/cambiar-password');

  return (
    <DashboardShell role="admin" userName={profile.fullName}>
      {children}
    </DashboardShell>
  );
}