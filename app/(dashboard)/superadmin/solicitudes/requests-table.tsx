"use client";

import { useMemo, useState } from "react";
import { createAccountAction, rejectRequestAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { industryTypes } from "@/lib/validators/businessSchema";

type ContactRequest = {
  id: string;
  full_name: string;
  business_name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function RequestsTable({ requests }: { requests: ContactRequest[] }) {
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [industryByRequest, setIndustryByRequest] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Numeración por orden de llegada (la más antigua = #1) — fija, no cambia
  // aunque la solicitud se apruebe o rechace después.
  const numberById = useMemo(() => {
    const byOldest = [...requests].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const map = new Map<string, number>();
    byOldest.forEach((r, i) => map.set(r.id, i + 1));
    return map;
  }, [requests]);

  const pending = requests.filter((r) => r.status === "new");
  const approved = requests.filter((r) => r.status === "approved");
  const list = tab === "pending" ? pending : approved;
  const selected = requests.find((r) => r.id === selectedId) ?? null;

  async function handleCreate(id: string) {
    const industryType = industryByRequest[id];
    if (!industryType) {
      setError("Selecciona el tipo de negocio antes de aceptar la solicitud.");
      return;
    }
    setLoadingId(id);
    setError(null);
    const result = await createAccountAction(id, industryType);
    setLoadingId(null);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) {
      setCredentials(result.data);
      setSelectedId(null);
      setTab("approved");
    }
  }

  async function handleReject(id: string) {
    setLoadingId(id);
    setError(null);
    const result = await rejectRequestAction(id);
    setLoadingId(null);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSelectedId(null);
  }

  return (
    <div className="space-y-4">
      {credentials && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle style={{ color: 'var(--nexora-signal)' }}>
              CUENTA CREADA EXITOSAMENTE
            </CardTitle>
            <CardDescription>
              Copia estas credenciales temporales, no se volverán a mostrar:
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm" style={{ color: 'var(--nexora-ink)' }}>
              Correo: <span className="font-mono-data">{credentials.email}</span>
            </p>
            <p className="text-sm" style={{ color: 'var(--nexora-ink)' }}>
              Contraseña temporal: <span className="font-mono-data">{credentials.tempPassword}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setCredentials(null)}
            >
              Cerrar
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <p
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
        >
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <button
              onClick={() => { setTab("pending"); setSelectedId(null); }}
              className="rounded-full px-4 py-1.5 text-sm transition-colors"
              style={{
                background: tab === "pending" ? 'var(--nexora-signal)' : 'transparent',
                color: tab === "pending" ? '#000' : 'var(--nexora-ink-dim)',
              }}
            >
              Solicitudes ({pending.length})
            </button>
            <button
              onClick={() => { setTab("approved"); setSelectedId(null); }}
              className="rounded-full px-4 py-1.5 text-sm transition-colors"
              style={{
                background: tab === "approved" ? 'var(--nexora-signal)' : 'transparent',
                color: tab === "approved" ? '#000' : 'var(--nexora-ink-dim)',
              }}
            >
              Cuentas aceptadas ({approved.length})
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {selected ? (
            <RequestDetail
              request={selected}
              number={numberById.get(selected.id) ?? 0}
              industryType={industryByRequest[selected.id] ?? ""}
              onIndustryChange={(value) =>
                setIndustryByRequest((prev) => ({ ...prev, [selected.id]: value }))
              }
              loading={loadingId === selected.id}
              onBack={() => setSelectedId(null)}
              onAccept={() => handleCreate(selected.id)}
              onReject={() => handleReject(selected.id)}
            />
          ) : (
            <div className="space-y-2">
              {list.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: 'var(--nexora-ink-dim)' }}>
                  {tab === "pending" ? "No hay solicitudes nuevas." : "Todavía no hay cuentas aceptadas."}
                </p>
              )}
              {list.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--nexora-ink)' }}>
                    Solicitud #{numberById.get(r.id)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                    {dateFormatter.format(new Date(r.created_at))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestDetail({
  request,
  number,
  industryType,
  onIndustryChange,
  loading,
  onBack,
  onAccept,
  onReject,
}: {
  request: ContactRequest;
  number: number;
  industryType: string;
  onIndustryChange: (value: string) => void;
  loading: boolean;
  onBack: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isPending = request.status === "new";

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-sm underline"
        style={{ color: 'var(--nexora-ink-dim)' }}
      >
        ← Volver
      </button>

      <h2 className="font-nexora text-lg" style={{ color: 'var(--nexora-ink)' }}>
        Solicitud #{number}
      </h2>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>Nombre</dt>
          <dd style={{ color: 'var(--nexora-ink)' }}>{request.full_name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>Negocio</dt>
          <dd style={{ color: 'var(--nexora-ink)' }}>{request.business_name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>Correo</dt>
          <dd style={{ color: 'var(--nexora-ink)' }}>{request.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>Teléfono</dt>
          <dd style={{ color: 'var(--nexora-ink)' }}>{request.phone ?? "—"}</dd>
        </div>
      </dl>

      <div>
        <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
          Cuéntanos sobre tu negocio
        </dt>
        <dd className="mt-1 whitespace-pre-wrap" style={{ color: 'var(--nexora-ink)' }}>
          {request.message ?? "—"}
        </dd>
      </div>

      {isPending ? (
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
              Tipo de negocio (necesario para crear la cuenta)
            </label>
            <select
              value={industryType}
              onChange={(e) => onIndustryChange(e.target.value)}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--nexora-ink)' }}
            >
              <option value="" disabled>Selecciona una opción...</option>
              {industryTypes.map((it) => (
                <option key={it.value} value={it.value} style={{ color: '#000' }}>
                  {it.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <Button disabled={loading} onClick={onAccept}>
              {loading ? "Creando..." : "Aceptar"}
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={onReject}
              style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--nexora-alert)' }}
            >
              Rechazar
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm pt-2" style={{ color: 'var(--nexora-signal)' }}>
          Cuenta creada.
        </p>
      )}
    </div>
  );
}
