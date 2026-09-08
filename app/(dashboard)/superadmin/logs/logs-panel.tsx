"use client";

import { useMemo, useState } from "react";
import {
  Search,
  LogIn,
  LogOut,
  Power,
  PowerOff,
  CheckCircle2,
  XCircle,
  UserPlus,
  UserCog,
  UserMinus,
  UserCheck,
  UserX,
  KeyRound,
  Image as ImageIcon,
  FileDown,
  Package,
  Upload,
  Link2,
  Megaphone,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { PlatformLogEntry, PlatformLogType } from "@/lib/services/platformLogService";
import { formatShortDateTime } from "@/lib/utils/date";
import { Dropdown } from "@/components/dashboard/shared/Dropdown";

const TYPE_META: Record<PlatformLogType, { icon: LucideIcon; color: string }> = {
  // Sesión
  login: { icon: LogIn, color: "var(--nexora-nova)" },
  signed_out: { icon: LogOut, color: "var(--nexora-ink-dim)" },
  signed_out_all_devices: { icon: LogOut, color: "var(--nexora-alert)" },
  session_device_mismatch: { icon: ShieldAlert, color: "var(--nexora-alert)" },
  // Negocios (superadmin)
  business_enabled: { icon: Power, color: "var(--nexora-signal)" },
  business_disabled: { icon: PowerOff, color: "var(--nexora-alert)" },
  // Solicitudes
  request_approved: { icon: CheckCircle2, color: "var(--nexora-signal)" },
  request_rejected: { icon: XCircle, color: "var(--nexora-alert)" },
  account_change_requested: { icon: KeyRound, color: "var(--nexora-nova)" },
  // Altas de cuenta
  registration_completed: { icon: UserPlus, color: "var(--nexora-nova)" },
  // Conexiones OAuth
  channel_connected_messenger: { icon: Link2, color: "var(--nexora-nova)" },
  channel_connected_instagram: { icon: Link2, color: "var(--nexora-nova)" },
  channel_connected_whatsapp: { icon: Link2, color: "var(--nexora-nova)" },
  ad_account_connected_meta: { icon: Megaphone, color: "var(--nexora-nova)" },
  ad_account_connected_google: { icon: Megaphone, color: "var(--nexora-nova)" },
  ad_account_connected_tiktok: { icon: Megaphone, color: "var(--nexora-nova)" },
  // Perfil propio
  password_changed: { icon: KeyRound, color: "var(--nexora-nova)" },
  avatar_updated: { icon: ImageIcon, color: "var(--nexora-nova)" },
  profile_updated: { icon: UserCog, color: "var(--nexora-nova)" },
  // Colaboradores
  collaborator_added: { icon: UserPlus, color: "var(--nexora-signal)" },
  collaborator_updated: { icon: UserCog, color: "var(--nexora-nova)" },
  collaborator_deactivated: { icon: UserMinus, color: "var(--nexora-alert)" },
  collaborator_reactivated: { icon: UserCheck, color: "var(--nexora-signal)" },
  collaborator_removed: { icon: UserX, color: "var(--nexora-alert)" },
  // Catálogo
  product_created: { icon: Package, color: "var(--nexora-signal)" },
  products_bulk_imported: { icon: Upload, color: "var(--nexora-signal)" },
  // Reportes
  report_downloaded: { icon: FileDown, color: "var(--nexora-nova)" },
  report_sent: { icon: CheckCircle2, color: "var(--nexora-signal)" },
  report_failed: { icon: XCircle, color: "var(--nexora-alert)" },
};

// Agrupa los tipos en chips de filtro — una pantalla con 27 tipos sueltos
// sería imposible de escanear; 9 categorías sí.
const FILTER_GROUPS: { key: string; label: string; types: PlatformLogType[] }[] = [
  { key: "sesion", label: "Sesión", types: ["login", "signed_out", "signed_out_all_devices", "session_device_mismatch"] },
  { key: "negocios", label: "Negocios", types: ["business_enabled", "business_disabled"] },
  { key: "solicitudes", label: "Solicitudes", types: ["request_approved", "request_rejected", "account_change_requested"] },
  { key: "registros", label: "Altas de cuenta", types: ["registration_completed"] },
  {
    key: "conexiones",
    label: "Conexiones",
    types: [
      "channel_connected_messenger",
      "channel_connected_instagram",
      "channel_connected_whatsapp",
      "ad_account_connected_meta",
      "ad_account_connected_google",
      "ad_account_connected_tiktok",
    ],
  },
  { key: "perfil", label: "Perfil", types: ["password_changed", "avatar_updated", "profile_updated"] },
  {
    key: "colaboradores",
    label: "Colaboradores",
    types: ["collaborator_added", "collaborator_updated", "collaborator_deactivated", "collaborator_reactivated", "collaborator_removed"],
  },
  { key: "catalogo", label: "Catálogo", types: ["product_created", "products_bulk_imported"] },
  { key: "reportes", label: "Reportes", types: ["report_downloaded", "report_sent", "report_failed"] },
];

export function LogsPanel({ entries }: { entries: PlatformLogEntry[] }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const group = FILTER_GROUPS.find((g) => g.key === activeFilter);
    return entries.filter((e) => {
      if (group && !group.types.includes(e.type)) return false;
      if (!q) return true;
      return (
        e.description.toLowerCase().includes(q) ||
        e.actor?.toLowerCase().includes(q) ||
        e.businessName?.toLowerCase().includes(q) ||
        e.detail?.toLowerCase().includes(q)
      );
    });
  }, [entries, query, activeFilter]);

  const availableGroups = FILTER_GROUPS.filter((g) => entries.some((e) => g.types.includes(e.type)));
  const activeGroup = availableGroups.find((g) => g.key === activeFilter) ?? null;
  const activeLabel = activeGroup
    ? `${activeGroup.label} (${entries.filter((e) => activeGroup.types.includes(e.type)).length})`
    : `Todos (${entries.length})`;

  return (
    <div className="space-y-6">
      <Dropdown
        className="mx-auto max-w-xs"
        triggerLabel={activeLabel}
        activeKey={activeFilter}
        options={[
          { key: "all", label: `Todos (${entries.length})` },
          ...availableGroups.map((g) => ({
            key: g.key,
            label: `${g.label} (${entries.filter((e) => g.types.includes(e.type)).length})`,
          })),
        ]}
        onSelect={setActiveFilter}
      />

      <div
        className="mx-auto flex max-w-xl items-center gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: "var(--nexora-line)" }}
      >
        <Search size={16} className="shrink-0" style={{ color: "var(--nexora-ink-dim)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por negocio, persona o detalle..."
          className="flex-1 min-w-0 bg-transparent text-sm outline-none"
          style={{ color: "var(--nexora-ink)" }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--nexora-ink-dim)" }}>
          No hay eventos que coincidan.
        </p>
      ) : (
        // overflow-x-auto: en móvil la tabla no se aplasta ni se rompe,
        // se desliza horizontal dentro de su propio contenedor — el resto
        // de la página no se ensancha.
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--nexora-line)" }}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--nexora-line)" }}>
                {["", "Evento", "Quién", "Negocio", "Cuándo"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--nexora-ink-dim)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LogRow({ entry }: { entry: PlatformLogEntry }) {
  const meta = TYPE_META[entry.type];
  const Icon = meta.icon;
  return (
    <tr className="border-b last:border-b-0 transition-colors hover:bg-white/[0.02]" style={{ borderColor: "var(--nexora-line)" }}>
      <td className="px-4 py-3">
        <Icon size={16} strokeWidth={1.75} style={{ color: meta.color }} />
      </td>
      <td className="px-4 py-3">
        <p className="font-medium" style={{ color: "var(--nexora-ink)" }}>
          {entry.description}
        </p>
        {entry.detail && (
          <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            {entry.detail}
          </p>
        )}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--nexora-ink-dim)" }}>
        {entry.actor ?? "—"}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--nexora-ink-dim)" }}>
        {entry.businessName ?? "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
        {formatShortDateTime(entry.createdAt)}
      </td>
    </tr>
  );
}
