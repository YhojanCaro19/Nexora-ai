"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startMetaConnectAction,
  startInstagramConnectAction,
  connectInstagramWithTokenAction,
  disconnectChannelAction,
} from "./actions";
import { ChannelIcon } from "./channel-icons";
import { CHANNEL_LABELS, type Channel, type ChannelConnectionPublic } from "@/lib/types/channel";

const ERROR_LABELS: Record<string, string> = {
  cancelado: "Cancelaste la conexión en Facebook.",
  state_invalido: "El enlace de conexión venció. Intenta de nuevo.",
  sesion: "La sesión no coincide. Vuelve a intentar desde tu cuenta.",
  sin_paginas: "Tu cuenta de Facebook no tiene ninguna página para conectar.",
  guardar: "No se pudo guardar la conexión.",
  graph: "Facebook rechazó la conexión. Revisa los permisos e intenta de nuevo.",
  rate: "Demasiados intentos seguidos. Espera un momento.",
  inesperado: "Ocurrió un error inesperado.",
  kind_no_soportado: "Ese tipo de conexión aún no está disponible.",
  ig_sin_config: "Instagram directo todavía no está configurado (faltan las credenciales de Instagram). Por ahora conéctalo vía Messenger si tu página de Facebook ya tiene Instagram ligado.",
};

export function ConnectNetworksSection({
  connections,
}: {
  connections: ChannelConnectionPublic[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const connected = params.get("connected");
  const pageName = params.get("page");
  const multiple = params.get("multiple");
  const errorCode = params.get("error");

  // Aviso de resultado del OAuth: se muestra, se autodescarta a los 4 s, y
  // limpia los query params para que no reaparezca en cada render.
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

  const byChannel = new Map(connections.map((c) => [c.channel, c]));

  return (
    <div className="mx-auto max-w-md space-y-4">
      {notice && connected && (
        <Banner tone="ok" onClose={dismissNotice}>
          {CHANNEL_LABELS[connected as Channel] ?? "Canal"} conectado
          {pageName ? ` — «${pageName}»` : ""}.
          {multiple ? ` Tienes ${multiple} páginas; por ahora se conecta la primera.` : ""}
        </Banner>
      )}
      {notice && errorCode && (
        <Banner tone="error" onClose={dismissNotice}>
          {ERROR_LABELS[errorCode] ?? "No se pudo conectar."}
        </Banner>
      )}

      <ChannelRow channel="messenger" connection={byChannel.get("messenger")} />
      <ChannelRow channel="instagram" connection={byChannel.get("instagram")} />
      <ChannelRow channel="whatsapp" connection={byChannel.get("whatsapp")} comingSoon />

      <p className="pt-1 text-center text-[11px] leading-relaxed" style={{ color: "var(--nexora-ink-dim)" }}>
        Instagram se conecta directo con tu cuenta de Instagram profesional —
        no necesitas una página de Facebook. Si ya tienes una página ligada a
        Instagram, al conectar Messenger también queda lista.
      </p>
    </div>
  );
}

function ChannelRow({
  channel,
  connection,
  comingSoon,
}: {
  channel: Channel;
  connection?: ChannelConnectionPublic;
  comingSoon?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState("");

  const isActive = connection?.status === "active";
  const isError = connection?.status === "error" || connection?.status === "expired";

  // Instagram usa su propio flujo (Instagram Login directo, sin Página de FB).
  const connectAction =
    channel === "instagram" ? startInstagramConnectAction : startMetaConnectAction;

  async function disconnect() {
    setBusy(true);
    setError(null);
    const res = await disconnectChannelAction(channel);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  async function connectWithToken() {
    setBusy(true);
    setError(null);
    const res = await connectInstagramWithTokenAction(token);
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setToken("");
      setShowToken(false);
    }
  }

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--nexora-line)" }}>
      <div className="flex items-center gap-3">
        <ChannelIcon channel={channel} size={20} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
            {CHANNEL_LABELS[channel]}
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
          <form action={connectAction}>
            <Button type="submit" size="sm">
              Reconectar
            </Button>
          </form>
        ) : isActive ? (
          <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>
            {busy ? "..." : "Desconectar"}
          </Button>
        ) : (
          <form action={connectAction}>
            <Button type="submit" size="sm">
              Conectar
            </Button>
          </form>
        )}
      </div>

      {/* Instagram: alternativa a pegar un token de acceso (dashboard de Meta o BSP). */}
      {channel === "instagram" && !isActive && !comingSoon && (
        <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--nexora-line)" }}>
          {showToken ? (
            <div className="space-y-2">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pega el token de acceso de Instagram"
                className="w-full rounded-md border bg-transparent px-2 py-1.5 text-[11px] font-mono-data"
                style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
              />
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={connectWithToken} disabled={busy || token.trim().length < 20}>
                  {busy ? "..." : "Guardar"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowToken(false)} disabled={busy}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowToken(true)}
              className="mx-auto block text-[11px] underline"
              style={{ color: "var(--nexora-ink-dim)" }}
            >
              o pegar un token de acceso
            </button>
          )}
        </div>
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
