'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavGroup } from '@/lib/constants/nav-items';
import { Avatar } from '@/components/shared/Avatar';

interface SidebarProps {
  groups: NavGroup[];
  roleLabel: string;
  userName: string;
  // null para superadmin o para quien no haya subido foto — Avatar cae
  // al fallback de iniciales. Solo visualización, sin click-to-upload
  // (eso vive únicamente en Perfil).
  avatarUrl?: string | null;
}

function NavGroups({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <nav className="flex-1 px-3 space-y-7 overflow-y-auto pb-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p
            className="px-3 mb-2.5 text-[10px] font-medium tracking-[0.14em] uppercase"
            style={{ color: 'var(--nexora-ink-dim)', opacity: 0.6 }}
          >
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-light transition-colors duration-200"
                  style={{
                    color: active ? 'var(--nexora-ink)' : 'var(--nexora-ink-dim)',
                    background: active ? 'rgba(238,240,247,0.08)' : 'transparent',
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full nexora-pulse"
                      style={{ background: 'var(--nexora-nova)' }}
                    />
                  )}
                  <Icon size={16} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// Barra inferior de navegación para móvil — fila horizontal deslizable
// (scroll-x nativo), tipo "tab bar" de app. Reemplaza al menú hamburguesa
// de antes (barra superior + panel lateral con overlay): pedido explícito
// "no debe salir la hamburguesa, mejor que salgan las opciones abajo, pero
// que sean movibles, porque obvio no cabe dentro del ancho de la
// pantalla". Los grupos de NavGroups (Principal/Operación/Negocio, etc.)
// se aplanan acá a propósito — en una tab bar no hay espacio ni sentido
// para repetir encabezados de sección, solo una fila continua en el mismo
// orden que ya tiene el sidebar de escritorio.
function MobileBottomNav({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  const items = groups.flatMap((group) => group.items);
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto"
      style={{
        background: 'var(--nexora-panel)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        // Respeta el home indicator de iOS/Android en vez de quedar tapada
        // por él — cae a 0 en dispositivos sin ese recorte.
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className="flex shrink-0 flex-col items-center justify-center gap-1 px-4 py-2.5 min-w-[68px] transition-colors duration-200"
            style={{ color: active ? 'var(--nexora-nova)' : 'var(--nexora-ink-dim)' }}
          >
            <Icon size={19} strokeWidth={active ? 2 : 1.5} />
            <span className="text-[10px] font-light whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export const Sidebar = ({ groups, roleLabel, userName, avatarUrl = null }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: sidebar fijo, igual que antes */}
      <aside
        className="hidden md:flex w-64 shrink-0 h-full flex-col"
        style={{ background: 'var(--nexora-panel)' }}
      >
        <div className="px-6 py-7 flex items-center justify-center gap-2.5">
          <Avatar url={avatarUrl} name={userName} size={26} />
          <p className="text-[15px] font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--nexora-ink)' }}>
            {roleLabel}
          </p>
        </div>
        <NavGroups groups={groups} pathname={pathname} />
      </aside>

      {/* Mobile: barra inferior — ver MobileBottomNav arriba. La
          identificación (avatar + rol) que antes vivía en la barra
          superior de acá se movió al header compartido de
          DashboardShell.tsx, para no duplicar esa franja en dos lugares. */}
      <MobileBottomNav groups={groups} pathname={pathname} />
    </>
  );
};
