"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Camera, Phone, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startMetaConnectAction, disconnectChannelAction } from "./actions";
import { CHANNEL_LABELS, type Channel, type ChannelConnectionPublic } from "@/lib/types/channel";

const ICONS: Record<Channel, LucideIcon> = {
  messenger: MessageCircle,
  instagram: Camera,
  whatsapp: Phone,
};

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
};

export function ConnectNetworksSection({
  connections,
}: {
  connections: ChannelConnectionPublic[];
}) {
  const params = useSearchParams();
  const connected = params.get("connected");
  const pageName = params.get("page");
  const multiple = params.get("multiple");
  const errorCode = params.get("error");

  const byChannel = new Map(connections.map((c) => [c.channel, c]));

  return (
    <div className="mx-auto max-w-md space-y-4">
      <p className="text-center text-xs leading-relaxed" style={{ color: "var(--nexora-ink-dim)" }}>
        Conecta las redes del negocio para que el agente responda los mensajes
        ahí. Puedes desconectar cuando quieras.
      </p>

      {connected && (
        <Banner tone="ok">
          {CHANNEL_LABELS[connected as Channel] ?? "Canal"} conectado
          {pageName ? ` — «${pageName}»` : ""}.
          {multiple ? ` Tienes ${multiple} páginas; por ahora se conecta la primera.` : ""}
        </Banner>
      )}
      {errorCode && (
        <Banner tone="error">{ERROR_LABELS[errorCode] ?? "No se pudo conectar."}</Banner>
      )}

      <ChannelRow channel="messenger" connection={byChannel.get("messenger")} />
      <ChannelRow channel="instagram" connection={byChannel.get("instagram")} igNote />
      <ChannelRow channel="whatsapp" connection={byChannel.get("whatsapp")} comingSoon />

      <p className="pt-1 text-center text-[11px] leading-relaxed" style={{ color: "var(--nexora-ink-dim)" }}>
        Messenger e Instagram se conectan juntos: al vincular tu página de
        Facebook, si tiene una cuenta de Instagram ligada, también queda lista.
      </p>
    </div>
  );
}

function ChannelRow({
  channel,
  connection,
  comingSoon,
  igNote,
}: {
  channel: Channel;
  connection?: ChannelConnectionPublic;
  comingSoon?: boolean;
  igNote?: boolean;
}) {
  const Icon = ICONS[channel];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = connection?.status === "active";
  const isError = connection?.status === "error" || connection?.status === "expired";

  async function disconnect() {
    setBusy(true);
    setError(null);
    const res = await disconnectChannelAction(channel);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: "var(--nexora-line)" }}>
      <Icon size={20} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
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
                : igNote
                  ? "Se conecta junto con Messenger"
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
      ) : isActive || isError ? (
        <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>
          {busy ? "..." : "Desconectar"}
        </Button>
      ) : channel === "instagram" ? null : (
        <form action={startMetaConnectAction}>
          <Button type="submit" size="sm">
            Conectar
          </Button>
        </form>
      )}
    </div>
  );
}

function Banner({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border px-3 py-2 text-center text-xs leading-relaxed"
      style={{
        borderColor: tone === "ok" ? "var(--nexora-signal)" : "var(--nexora-alert)",
        color: tone === "ok" ? "var(--nexora-signal)" : "var(--nexora-alert)",
      }}
    >
      {children}
    </div>
  );
}
