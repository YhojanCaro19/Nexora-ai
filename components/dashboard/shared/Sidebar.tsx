'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavGroup } from '@/lib/constants/nav-items';

interface SidebarProps {
  groups: NavGroup[];
  roleLabel: string;
}

export const Sidebar = ({ groups, roleLabel }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 shrink-0 h-full flex flex-col"
      style={{ background: 'var(--nexora-panel)' }}
    >
      <div className="px-6 py-7 text-center">
        <p className="text-[15px] font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--nexora-ink)' }}>
          {roleLabel}
        </p>
      </div>

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
                      background: active ? 'rgba(124,156,255,0.08)' : 'transparent',
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
    </aside>
  );
};