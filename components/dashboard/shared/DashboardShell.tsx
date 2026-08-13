'use client';

import { LogOut } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { logout } from '@/app/(experience)/(auth)/actions';
import { ADMIN_NAV, COLABORADOR_NAV, SUPERADMIN_NAV } from '@/lib/constants/nav-items';

type Role = 'admin' | 'colaborador' | 'superadmin';

const NAV_BY_ROLE = {
  admin: ADMIN_NAV,
  colaborador: COLABORADOR_NAV,
  superadmin: SUPERADMIN_NAV,
};

const LABEL_BY_ROLE: Record<Role, string> = {
  admin: 'Admin',
  colaborador: 'Colaborador',
  superadmin: 'SuperAdmin',
};

interface DashboardShellProps {
  role: Role;
  userName: string;
  children: React.ReactNode;
}

export const DashboardShell = ({ role, userName, children }: DashboardShellProps) => {
  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden" style={{ background: 'var(--nexora-void)' }}>
      <Sidebar groups={NAV_BY_ROLE[role]} roleLabel={LABEL_BY_ROLE[role]} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 relative flex items-center justify-end px-4 md:px-8 shrink-0">
          <span
            className="aventhra-logo absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[16px] md:text-[22px] tracking-[0.18em] whitespace-nowrap"
            style={{ color: 'var(--nexora-ink)' }}
          >
            AVENTHRA
          </span>

          <form action={logout}>
            <button
              type="submit"
              title={`Cerrar sesión (${userName})`}
              className="flex items-center gap-2 text-[13px] font-light text-[var(--nexora-ink-dim)] transition-colors duration-200 hover:text-[var(--nexora-ink)]"
            >
              <LogOut size={15} strokeWidth={1.5} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </form>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
};