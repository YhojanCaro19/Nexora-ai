"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requestDeleteCollaboratorOtpAction, verifyAndDeleteCollaboratorAction } from "./actions";
import { ASSIGNABLE_MODULES } from "@/lib/constants/nav-items";
import { OTP_CODE_LENGTH } from "@/lib/constants/otp";
import type { CollaboratorListItem } from "@/lib/services/collaboratorService";

const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  ASSIGNABLE_MODULES.map((m) => [m.key, m.label])
);

function ModulePills({ permissions }: { permissions: string[] }) {
  if (permissions.length === 0) {
    return <span style={{ color: 'var(--nexora-ink-dim)' }}>—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {permissions.map((key) => (
        <span
          key={key}
          className="text-[11px] font-medium px-2 py-0.5 rounded-md"
          style={{ color: 'var(--nexora-nova)', background: 'rgba(238,240,247,0.1)' }}
        >
          {MODULE_LABELS[key] ?? key}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const color = active ? 'var(--nexora-signal)' : 'var(--nexora-ink-dim)';
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium"
      style={{ color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

// Borrado real (cuenta de Auth incluida) — por eso pide código de 6
// dígitos al correo del admin antes de ejecutarlo, no solo un
// "¿estás seguro?".
type DeleteStep = "idle" | "confirming" | "otp-sent";

function DeleteCollaboratorButton({ id, name }: { id: string; name: string }) {
  const [step, setStep] = useState<DeleteStep>("idle");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    setLoading(true);
    setError(null);
    const result = await requestDeleteCollaboratorOtpAction();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("otp-sent");
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await verifyAndDeleteCollaboratorAction(id, code);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("idle");
  }

  if (step === "confirming") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            Te enviamos un código a tu correo para eliminar a {name}.
          </span>
          <Button type="button" disabled={loading} className="h-7 px-2 text-xs" onClick={handleSendCode}>
            {loading ? "Enviando..." : "Enviar código"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={loading}
            onClick={() => setStep("idle")}
          >
            Cancelar
          </Button>
        </div>
        {error && <span className="text-xs" style={{ color: 'var(--nexora-alert)' }}>{error}</span>}
      </div>
    );
  }

  if (step === "otp-sent") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_CODE_LENGTH))}
            inputMode="numeric"
            maxLength={OTP_CODE_LENGTH}
            placeholder="00000000"
            className="h-7 w-28 text-center text-xs tracking-[0.2em]"
          />
          <Button
            type="button"
            variant="outline"
            className="h-7 px-2 text-xs"
            style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--nexora-alert)' }}
            disabled={loading || code.length !== OTP_CODE_LENGTH}
            onClick={handleConfirm}
          >
            {loading ? "Eliminando..." : "Confirmar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={loading}
            onClick={() => setStep("idle")}
          >
            Cancelar
          </Button>
        </div>
        {error && <span className="text-xs" style={{ color: 'var(--nexora-alert)' }}>{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setStep("confirming")}
      className="inline-flex items-center gap-1.5 text-xs transition-colors"
      style={{ color: 'var(--nexora-ink-dim)' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nexora-alert)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nexora-ink-dim)')}
    >
      <Trash2 size={14} />
      Eliminar
    </button>
  );
}

export function CollaboratorsTable({
  collaborators,
}: {
  collaborators: CollaboratorListItem[];
}) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Colaboradores</CardTitle>
        <CardDescription>
          {collaborators.length === 0
            ? "Todavía no has creado ningún colaborador."
            : `${collaborators.length} colaborador${collaborators.length === 1 ? "" : "es"} en tu negocio.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collaborators.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium" style={{ color: 'var(--nexora-ink)' }}>
                  {c.full_name ?? "—"}
                </TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{c.email}</TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{c.phone ?? "—"}</TableCell>
                <TableCell>
                  <ModulePills permissions={c.permissions} />
                </TableCell>
                <TableCell>
                  <StatusBadge active={c.is_active} />
                </TableCell>
                <TableCell className="text-right">
                  <DeleteCollaboratorButton id={c.id} name={c.full_name ?? c.email} />
                </TableCell>
              </TableRow>
            ))}
            {collaborators.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  No hay colaboradores todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
