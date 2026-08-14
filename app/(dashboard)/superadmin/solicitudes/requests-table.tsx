"use client";

import { useMemo, useState } from "react";
import { ClipboardList, CheckCircle2, ChevronLeft, UserCircle, Building2, MessageSquare } from "lucide-react";
import { createAccountAction, rejectRequestAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { industryTypes } from "@/lib/validators/businessSchema";
import { formatShortDateTime } from "@/lib/utils/date";

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

type View = "chooser" | "pending" | "approved";

export function RequestsTable({ requests }: { requests: ContactRequest[] }) {
  const [view, setView] = useState<View>("chooser");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [industryByRequest, setIndustryByRequest] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [rejected, setRejected] = useState(false);
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
  const list = view === "approved" ? approved : pending;
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
      setView("approved");
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
    setView("chooser");
    setRejected(true);
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

      {rejected && (
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-sm font-medium" style={{ color: 'var(--nexora-signal)' }}>
              Solicitud rechazada exitosamente.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setRejected(false)}
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

      <div>
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
          ) : view === "chooser" ? (
            <Chooser
              pendingCount={pending.length}
              approvedCount={approved.length}
              onChoose={setView}
            />
          ) : (
            <div className="space-y-5">
              <div className="relative flex items-center justify-center">
                <BackButton onClick={() => setView("chooser")} className="absolute left-0" />
                <h2 className="font-nexora text-base text-center" style={{ color: 'var(--nexora-ink)' }}>
                  {view === "pending" ? "Solicitudes en espera" : "Cuentas aceptadas"}
                </h2>
              </div>

              {list.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: 'var(--nexora-ink-dim)' }}>
                  {view === "pending" ? "No hay solicitudes nuevas." : "Todavía no hay cuentas aceptadas."}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {list.map((r) => (
                    <RequestCard
                      key={r.id}
                      number={numberById.get(r.id) ?? 0}
                      date={r.created_at}
                      approved={r.status === "approved"}
                      onClick={() => setSelectedId(r.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

function Chooser({
  pendingCount,
  approvedCount,
  onChoose,
}: {
  pendingCount: number;
  approvedCount: number;
  onChoose: (view: "pending" | "approved") => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-10">
      <ChooserButton
        icon={ClipboardList}
        label="Solicitudes"
        count={pendingCount}
        accent="var(--nexora-nova)"
        onClick={() => onChoose("pending")}
      />
      <ChooserButton
        icon={CheckCircle2}
        label="Cuentas aceptadas"
        count={approvedCount}
        accent="var(--nexora-nova)"
        onClick={() => onChoose("approved")}
      />
    </div>
  );
}

function ChooserButton({
  icon: Icon,
  label,
  count,
  accent,
  onClick,
}: {
  icon: typeof ClipboardList;
  label: string;
  count: number;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-3 w-48 h-48 rounded-3xl border transition-all duration-300 hover:scale-105"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <Icon size={32} strokeWidth={1.5} style={{ color: accent }} />
      <span className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
        {label}
      </span>
      <span className="text-2xl font-light" style={{ color: 'var(--nexora-ink-dim)' }}>
        {count}
      </span>
    </button>
  );
}

function BackButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06] ${className}`}
      style={{ color: 'var(--nexora-ink-dim)' }}
    >
      <ChevronLeft size={16} />
      Volver
    </button>
  );
}

function RequestCard({
  number,
  date,
  approved,
  onClick,
}: {
  number: number;
  date: string;
  approved: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="aspect-square flex flex-col items-center justify-center rounded-2xl border p-4 transition-all duration-300 hover:scale-105"
      style={{ borderColor: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)' }}
    >
      <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--nexora-ink-dim)' }}>
        {approved ? "Cuenta número" : "Solicitud número"}
      </span>
      <span className="text-5xl font-light mt-3 mb-3" style={{ color: 'var(--nexora-ink)' }}>
        {number}
      </span>
      <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
        {formatShortDateTime(date)}
      </span>
    </button>
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
    <div className="space-y-8">
      <div className="relative flex items-center justify-center">
        <BackButton onClick={onBack} className="absolute left-0" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="font-nexora text-3xl font-semibold" style={{ color: 'var(--nexora-ink)' }}>
          {isPending ? "Solicitud" : "Cuenta"} #{number}
        </h2>
        <span
          className="inline-block rounded-full px-3 py-1 text-xs uppercase tracking-wide"
          style={{
            background: isPending ? 'rgba(238,240,247,0.08)' : 'rgba(52,211,153,0.1)',
            color: isPending ? 'var(--nexora-ink-dim)' : 'var(--nexora-signal)',
          }}
        >
          {isPending ? "En espera" : "Aprobada"}
        </span>
      </div>

      {/* El selector va arriba, antes de las cards — así el desplegable
          tiene toda la página debajo para abrirse sin quedar cortado
          contra el borde inferior de la ventana. */}
      {isPending && (
        <div className="flex flex-col items-center text-center gap-1.5 w-full max-w-xs mx-auto">
          <label className="block text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
            Tipo de negocio (necesario para crear la cuenta)
          </label>
          {/* Siempre un string ("" al inicio, nunca undefined) para que el
              Select quede controlado desde el primer render — pasar
              undefined cuando industryType es "" lo arrancaba como
              no-controlado y luego Base UI se quejaba al volverse
              controlado apenas se elegía una opción. */}
          <Select value={industryType} onValueChange={(value) => onIndustryChange(value as string)}>
            <SelectTrigger
              className="w-full py-2"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--nexora-ink)' }}
            >
              <SelectValue placeholder="Selecciona una opción..." />
            </SelectTrigger>
            <SelectContent>
              {industryTypes.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <section className="rounded-2xl border p-8 space-y-6 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center gap-2">
            <UserCircle size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
            <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
              Contacto
            </h3>
          </div>
          <div className="space-y-5">
            <InfoRow label="Nombre" value={request.full_name} />
            <InfoRow label="Correo" value={request.email} />
            <InfoRow label="Teléfono" value={request.phone ?? "—"} />
          </div>
        </section>

        <section className="rounded-2xl border p-8 space-y-6 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center gap-2">
            <Building2 size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
            <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
              Negocio
            </h3>
          </div>
          <div className="space-y-5">
            <InfoRow label="Nombre del negocio" value={request.business_name ?? "—"} />
            <div>
              <dt className="text-xs uppercase tracking-wide flex items-center justify-center gap-1.5" style={{ color: 'var(--nexora-ink-dim)' }}>
                <MessageSquare size={12} />
                Cuéntanos sobre tu negocio
              </dt>
              <dd className="mt-1.5 text-sm whitespace-pre-wrap" style={{ color: 'var(--nexora-ink)' }}>
                {request.message ?? "—"}
              </dd>
            </div>
          </div>
        </section>
      </div>

      {isPending ? (
        <div className="flex justify-center gap-3">
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
      ) : (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-signal)' }}>
          Cuenta creada.
        </p>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </dt>
      <dd className="text-base font-semibold" style={{ color: 'var(--nexora-ink)' }}>
        {value}
      </dd>
    </div>
  );
}
