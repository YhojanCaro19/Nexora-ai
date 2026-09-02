'use client';

import { useEffect, useState, type ReactNode } from 'react';

const TAB_KEY = 'av_tab';

// "Login por pestaña". La sesión de Supabase vive en cookies httpOnly
// (compartidas entre pestañas del mismo navegador), pero AVENTHRA exige
// que CADA pestaña se active por su cuenta:
//
//  - La pestaña que completó el login de Google trae una cookie
//    `av_tab_grant` de un solo uso. Este guard la canjea en
//    /api/auth/claim-tab y marca la pestaña en `sessionStorage` (que es
//    por-pestaña, no se comparte ni sobrevive a cerrarla).
//  - Un refresh de esa misma pestaña conserva el `sessionStorage` → entra
//    directo.
//  - Cualquier OTRA pestaña (URL pegada, "abrir en pestaña nueva",
//    duplicar ventana) no tiene el grant (ya se consumió) ni el
//    `sessionStorage` → se va a /login. La URL nunca alcanza para entrar.
//
// Mientras se verifica, y si falla, NO se renderizan los children — así el
// contenido del panel no llega siquiera a pintarse en una pestaña no
// autorizada.
export function TabSessionGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    const decide = async (): Promise<boolean> => {
      try {
        if (sessionStorage.getItem(TAB_KEY)) return true;
      } catch {
        // sessionStorage inaccesible (navegador en modo restringido):
        // seguimos al canje del grant igual.
      }

      const res = await fetch('/api/auth/claim-tab', { method: 'POST', cache: 'no-store' });
      if (!res.ok) return false;
      try {
        sessionStorage.setItem(TAB_KEY, '1');
      } catch {
        /* sin sessionStorage: cada navegación completa revalidará */
      }
      return true;
    };

    decide()
      .then((ok) => {
        if (!alive) return;
        if (ok) setReady(true);
        else window.location.replace('/login?reason=tab');
      })
      .catch(() => {
        if (alive) window.location.replace('/login?reason=tab');
      });

    return () => {
      alive = false;
    };
  }, []);

  if (ready) return <>{children}</>;

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--nexora-void)' }}
    >
      <span className="text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
        Verificando sesión…
      </span>
    </div>
  );
}
