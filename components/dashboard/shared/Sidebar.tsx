'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
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

function NavGroups({ groups, pathname, onNavigate }: { groups: NavGroup[]; pathname: string; onNavigate?: () => void }) {
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
                  onClick={onNavigate}
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

export const Sidebar = ({ groups, roleLabel, userName, avatarUrl = null }: SidebarProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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

      {/* Mobile: barra superior + menú hamburguesa */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'var(--nexora-panel)' }}
      >
        <div className="flex items-center gap-2">
          <Avatar url={avatarUrl} name={userName} size={24} />
          <p className="text-[13px] font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--nexora-ink)' }}>
            {roleLabel}
          </p>
        </div>
        <button onClick={() => setIsOpen(true)} aria-label="Abrir menú">
          <Menu size={20} style={{ color: 'var(--nexora-ink)' }} />
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="w-64 h-full flex flex-col"
            style={{ background: 'var(--nexora-panel)' }}
          >
            <div className="px-6 py-7 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar url={avatarUrl} name={userName} size={26} />
                <p className="text-[15px] font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--nexora-ink)' }}>
                  {roleLabel}
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} aria-label="Cerrar menú">
                <X size={20} style={{ color: 'var(--nexora-ink)' }} />
              </button>
            </div>
            <NavGroups groups={groups} pathname={pathname} onNavigate={() => setIsOpen(false)} />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
};
