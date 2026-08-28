'use client';

import { LogOut } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { CreditsBadge } from './CreditsBadge';
import { logout } from '@/app/(experience)/(auth)/actions';
import { ADMIN_NAV, SUPERADMIN_NAV, getColaboradorNav } from '@/lib/constants/nav-items';

type Role = 'admin' | 'colaborador' | 'superadmin';

const LABEL_BY_ROLE: Record<Role, string> = {
  admin: 'Admin',
  colaborador: 'Colaborador',
  superadmin: 'SuperAdmin',
};

interface DashboardShellProps {
  role: Role;
  userName: string;
  // Solo aplica a colaborador — admin/superadmin ven siempre su menú
  // completo. El menú del colaborador se arma en base a esto, no es una
  // lista fija (ver getColaboradorNav).
  permissions?: string[];
  // null para superadmin (no tiene business_member, así que no tiene
  // avatar propio) o para cualquiera que no haya subido foto todavía —
  // el Sidebar cae al fallback de iniciales en ambos casos.
  avatarUrl?: string | null;
  // Saldo de créditos del negocio. `undefined` = no aplica (superadmin);
  // `null` = el módulo de créditos aún no está en la DB; número = saldo.
  credits?: number | null;
  children: React.ReactNode;
}

export const DashboardShell = ({ role, userName, permissions = [], avatarUrl = null, credits, children }: DashboardShellProps) => {
  const groups =
    role === 'admin' ? ADMIN_NAV : role === 'superadmin' ? SUPERADMIN_NAV : getColaboradorNav(permissions);

  return (
    // min-h-screen + md:h-screen (no h-screen solo) a propósito: en
    // escritorio se necesita la altura EXACTA de 100vh con overflow-hidden
    // para que el sidebar fijo + scroll interno del <main> funcionen (como
    // antes). En móvil, ese mismo patrón ("h-screen + overflow interno
    // anidado") es la causa real de "la página se corta y no deja bajar
    // más" — iOS Safari calcula mal la altura de un contenedor con
    // overflow-y-auto anidado dentro de un 100vh cuando la barra de
    // direcciones dinámica cambia de tamaño, y el contenido de más abajo
    // queda atrapado sin poder desplazarse. En móvil, en cambio, dejamos
    // que la página completa se desplace de forma nativa (sin
    // overflow-hidden ni scroll interno) — el patrón normal y confiable de
    // cualquier sitio web.
    <div className="min-h-screen flex flex-col md:h-screen md:flex-row md:overflow-hidden" style={{ background: 'var(--nexora-void)' }}>
      <Sidebar groups={groups} roleLabel={LABEL_BY_ROLE[role]} userName={userName} avatarUrl={avatarUrl} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 relative flex items-center justify-between md:justify-end px-4 md:px-8 shrink-0">
          {/* Identificación (avatar + rol) — antes vivía en la barra
              superior propia de Sidebar.tsx en móvil; ahora que esa barra
              es una tab bar inferior (ver MobileBottomNav), este es el
              único lugar donde se muestra en pantallas chicas. En
              escritorio ya se ve en el sidebar fijo, así que acá se
              esconde con md:hidden para no duplicarla. */}
          {/* Pedido explícito: en móvil solo el rol como texto, sin el
              círculo de avatar al lado (sí se sigue viendo en el sidebar
              fijo de escritorio, eso no cambió). */}
          <p
            className="md:hidden text-[13px] font-medium tracking-[0.1em] uppercase"
            style={{ color: 'var(--nexora-ink)' }}
          >
            {LABEL_BY_ROLE[role]}
          </p>
          {/* Absoluto siempre (no solo en md:) — a propósito: con
              justify-between en móvil, el bloque de avatar+rol (más ancho)
              y el botón de cerrar sesión (solo ícono, más angosto) no
              pesan igual, así que un centrado "flex" normal empuja el
              logo hacia la derecha. Posición absoluta lo saca del flujo
              flex por completo y lo centra contra el ancho real del
              header, sin importar qué tan angostos/anchos sean los
              elementos a los lados. */}
          <span
            className="aventhra-logo absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[16px] md:text-[22px] tracking-[0.18em] whitespace-nowrap"
            style={{ color: 'var(--nexora-ink)' }}
          >
            AVENTHRA
          </span>

          <div className="flex items-center gap-3 md:gap-4">
            {credits !== undefined && (
              <CreditsBadge
                credits={credits}
                href={role === 'admin' ? '/admin/creditos' : null}
              />
            )}
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
          </div>
        </header>
        {/* pb-24 en móvil: dejar espacio para que la tab bar fija de abajo
            (MobileBottomNav, ~56px + safe-area) no tape el final del
            contenido — en md+ vuelve a p-8 normal porque ahí no hay barra
            inferior. overflow-y-auto solo en md+ (ver el porqué completo
            arriba, en el div raíz): en móvil este <main> ya no es su
            propio contenedor de scroll, es la página entera la que se
            desplaza. */}
        <main className="flex-1 min-h-0 md:overflow-y-auto p-4 pb-24 md:p-8">{children}</main>
      </div>
    </div>
  );
};