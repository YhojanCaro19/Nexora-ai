"use client";

// Patrón "tocar y entrar" — mismo mecanismo que catalogo-panel.tsx y
// mi-agente-panel.tsx: tocar una fila reemplaza la lista por su vista
// dedicada con un botón Volver, nunca un acordeón. Cada vista es una de
// las acciones de seguridad ya existentes (PasswordSection,
// SignOutAllDevices, ActiveSessionsPreview) sin tocar su lógica interna.
import { useState } from "react";
import { ChevronLeft, ChevronRight, KeyRound, LogOut, Monitor, type LucideIcon } from "lucide-react";
import { PasswordSection } from "./password-section";
import { SignOutAllDevices } from "./sign-out-all-devices";
import { ActiveSessionsPreview } from "./active-sessions-preview";
import type { LoginEvent } from "@/lib/services/loginEventService";

type SectionKey = "password" | "sign-out-all" | "active-sessions";
type View = "list" | SectionKey;

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "password", label: "Cambiar contraseña", icon: KeyRound },
  { key: "sign-out-all", label: "Cerrar sesión en todos los dispositivos", icon: LogOut },
  { key: "active-sessions", label: "Sesiones activas", icon: Monitor },
];

interface SecurityPanelProps {
  // Ya resuelto en el server component (page.tsx) — este componente es
  // "use client" y no puede llamar a getRecentLoginEvents() (usa cookies
  // vía createClient()) directamente.
  loginEvents: LoginEvent[];
}

export function SecurityPanel({ loginEvents }: SecurityPanelProps) {
  const [view, setView] = useState<View>("list");

  if (view === "list") {
    return (
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted bg-card"
          >
            <Icon size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-nova)' }} />
            <span className="min-w-0 flex-1 text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
              {label}
            </span>
            <ChevronRight size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-ink-dim)' }} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setView("list")}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
        style={{ color: 'var(--nexora-ink-dim)' }}
      >
        <ChevronLeft size={16} />
        Volver
      </button>

      <h3 className="text-center text-base font-semibold font-nexora" style={{ color: 'var(--nexora-ink)' }}>
        {SECTIONS.find((s) => s.key === view)?.label}
      </h3>

      {view === "password" && <PasswordSection />}
      {view === "sign-out-all" && <SignOutAllDevices />}
      {view === "active-sessions" && <ActiveSessionsPreview events={loginEvents} />}
    </div>
  );
}
