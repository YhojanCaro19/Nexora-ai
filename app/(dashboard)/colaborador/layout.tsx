// app/(dashboard)/colaborador/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/get-session';
import { DashboardShell } from '@/components/dashboard/shared/DashboardShell';

export default async function ColaboradorLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'colaborador') redirect('/login');
  if (profile.mustChangePassword) redirect('/cambiar-password');

  return (
    <DashboardShell role="colaborador" userName={profile.fullName} permissions={profile.permissions}>
      {children}
    </DashboardShell>
  );
}