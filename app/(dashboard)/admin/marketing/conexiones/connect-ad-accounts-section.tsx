"use client";

// Mismo patrón que app/(dashboard)/admin/perfil/connect-networks-section.tsx
// (conectar redes), aplicado a cuentas publicitarias. Meta Ads ya funciona
// (OAuth real, ver metaOAuthService + app/api/auth/meta/callback); Google y
// TikTok Ads quedan "Próximamente" hasta que exista su propia app/credenciales.
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startMetaAdsConnectAction, disconnectAdAccountAction } from "../actions";
import { AdProviderIcon } from "./ad-provider-icons";
import { AD_PROVIDER_LABELS, type AdProvider, type AdAccountPublic } from "@/lib/types/adAccount";

const ERROR_LABELS: Record<string, string> = {
  cancelado: "Cancelaste la conexión en Facebook.",
  state_invalido: "El enlace de conexión venció. Intenta de nuevo.",
  sesion: "La sesión no coincide. Vuelve a intentar desde tu cuenta.",
  sin_cuentas_publicitarias: "Tu cuenta de Facebook no tiene ninguna cuenta publicitaria para conectar.",
  guardar: "No se pudo guardar la conexión.",
  graph: "Facebook rechazó la conexión. Revisa los permisos e intenta de nuevo.",
  rate: "Demasiados intentos seguidos. Espera un momento.",
  inesperado: "Ocurrió un error inesperado.",
  kind_no_soportado: "Ese tipo de conexión aún no está disponible.",
};

export function ConnectAdAccountsSection({ connections }: { connections: AdAccountPublic[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const connected = params.get("connected");
  const accountName = params.get("account");
  const errorCode = params.get("error");

  const [notice, setNotice] = useState<boolean>(Boolean(connected || errorCode));
  useEffect(() => {
    if (!connected && !errorCode) return;
    const t = setTimeout(() => dismissNotice(), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, errorCode]);

  function dismissNotice() {
    setNotice(false);
    router.replace(pathname, { scroll: false });
  }

  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  return (
    <div className="mx-auto max-w-md space-y-4">
      {notice && connected && (
        <Banner tone="ok" onClose={dismissNotice}>
          {AD_PROVIDER_LABELS.meta} conectado
          {accountName ? ` — «${accountName}»` : ""}.
        </Banner>
      )}
      {notice && errorCode && (
        <Banner tone="error" onClose={dismissNotice}>
          {ERROR_LABELS[errorCode] ?? "No se pudo conectar."}
        </Banner>
      )}

      <ProviderRow provider="meta" connection={byProvider.get("meta")} />
      <ProviderRow provider="google" connection={byProvider.get("google")} comingSoon />
      <ProviderRow provider="tiktok" connection={byProvider.get("tiktok")} comingSoon />
    </div>
  );
}

function ProviderRow({
  provider,
  connection,
  comingSoon,
}: {
  provider: AdProvider;
  connection?: AdAccountPublic;
  comingSoon?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = connection?.status === "active";
  const isError = connection?.status === "error" || connection?.status === "expired";

  async function disconnect() {
    setBusy(true);
    setError(null);
    const res = await disconnectAdAccountAction(provider);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: "var(--nexora-line)" }}>
      <AdProviderIcon provider={provider} size={22} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
          {AD_PROVIDER_LABELS[provider]}
        </p>
        <p className="truncate text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>
          {comingSoon
            ? "Próximamente"
            : isActive
              ? `Conectado${connection?.externalName ? ` · ${connection.externalName}` : ""}`
              : isError
                ? "Hay un problema — reconecta"
                : "No conectado"}
        </p>
        {error && (
          <p className="text-[11px]" style={{ color: "var(--nexora-alert)" }}>
            {error}
          </p>
        )}
      </div>

      {comingSoon ? (
        <Button variant="outline" size="sm" disabled>
          Pronto
        </Button>
      ) : isError ? (
        <form action={startMetaAdsConnectAction}>
          <Button type="submit" size="sm">
            Reconectar
          </Button>
        </form>
      ) : isActive ? (
        <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>
          {busy ? "..." : "Desconectar"}
        </Button>
      ) : (
        <form action={startMetaAdsConnectAction}>
          <Button type="submit" size="sm">
            Conectar
          </Button>
        </form>
      )}
    </div>
  );
}

function Banner({
  tone,
  children,
  onClose,
}: {
  tone: "ok" | "error";
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const color = tone === "ok" ? "var(--nexora-signal)" : "var(--nexora-alert)";
  return (
    <div
      className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed"
      style={{ borderColor: color, color }}
    >
      <span className="flex-1 text-center">{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="shrink-0 rounded p-0.5 transition-opacity hover:opacity-70"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
