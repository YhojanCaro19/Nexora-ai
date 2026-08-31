"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OtpInput } from "@/components/shared/OtpInput";
import {
  requestDeleteCollaboratorOtpAction,
  verifyAndDeleteCollaboratorAction,
  setCollaboratorActiveAction,
} from "./actions";
import { CollaboratorForm } from "./collaborator-form";
import { ASSIGNABLE_MODULES } from "@/lib/constants/nav-items";
import { OTP_CODE_LENGTH } from "@/lib/constants/otp";
import type { CollaboratorListItem } from "@/lib/services/collaboratorService";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { formatShortDateTime } from "@/lib/utils/date";

const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  ASSIGNABLE_MODULES.map((m) => [m.key, m.label])
);

// Toggle simple (chevron + useState) en vez del <Accordion> de
// components/ui/accordion.tsx: ese primitivo está pensado para una lista
// de filas independiente (border, rounded-xl, bg-card propios — ver el
// único bloque de comentarios de uso en app/globals.css), no para vivir
// suelto dentro de un <td>. Anidar su Header/Trigger/Panel ahí duplicaría
// bordes dentro de la fila de la tabla y se vería "una caja dentro de otra
// caja" — justo lo que se quiere evitar. Un botón + estado local logra el
// mismo resultado (colapsado por defecto, revela los badges reales al
// tocar) sin pelear con el layout de la tabla.
function ModulePills({ permissions }: { permissions: string[] }) {
  const [open, setOpen] = useState(false);

  if (permissions.length === 0) {
    return <span style={{ color: 'var(--nexora-ink-dim)' }}>—</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
        style={{ color: open ? 'var(--nexora-nova)' : 'var(--nexora-ink-dim)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nexora-nova)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = open ? 'var(--nexora-nova)' : 'var(--nexora-ink-dim)')}
      >
        Módulos ({permissions.length})
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul
          className="flex flex-col gap-1 pl-2.5 border-l"
          style={{ borderColor: 'var(--nexora-line)' }}
        >
          {permissions.map((key) => (
            <li
              key={key}
              className="flex items-center gap-1.5 text-[11px] font-medium"
              style={{ color: 'var(--nexora-nova)' }}
            >
              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--nexora-nova)' }} />
              {MODULE_LABELS[key] ?? key}
            </li>
          ))}
        </ul>
      )}
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
// "¿estás seguro?". El flujo de dos pasos vive en un modal (portal a
// document.body, mismo patrón que components/shared/AvatarCropper.tsx)
// para no deformar la fila de la tabla mientras dura la verificación.
type DeleteStep = "confirming" | "otp-sent";

function DeleteCollaboratorModal({
  name,
  onClose,
  onSendCode,
  onConfirm,
}: {
  name: string;
  onClose: () => void;
  onSendCode: () => Promise<{ error: string | null }>;
  onConfirm: (code: string) => Promise<{ error: string | null }>;
}) {
  const [step, setStep] = useState<DeleteStep>("confirming");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cerrar con Escape, mismo gesto que cualquier overlay modal del panel.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSendCode() {
    setLoading(true);
    setError(null);
    const result = await onSendCode();
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
    const result = await onConfirm(code);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl ring-1 ring-foreground/10 p-6 sm:p-8 flex flex-col items-center gap-4 text-center"
        style={{ background: "var(--nexora-panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-nexora text-sm" style={{ color: "var(--nexora-ink)" }}>
          Eliminar colaborador
        </p>

        {step === "confirming" ? (
          <p className="text-xs leading-relaxed" style={{ color: "var(--nexora-ink-dim)" }}>
            Vas a eliminar a{" "}
            <strong style={{ color: "var(--nexora-ink)" }}>{name}</strong> de forma
            permanente, incluida su cuenta de acceso. Te enviaremos un código de
            verificación a tu correo para confirmar.
          </p>
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: "var(--nexora-ink-dim)" }}>
            Ingresa el código de {OTP_CODE_LENGTH} dígitos que enviamos a tu correo.
          </p>
        )}

        {step === "otp-sent" && (
          <OtpInput
            value={code}
            onChange={setCode}
            length={OTP_CODE_LENGTH}
            disabled={loading}
            autoFocus
          />
        )}

        {error && (
          <span className="text-xs" style={{ color: "var(--nexora-alert)" }}>
            {error}
          </span>
        )}

        <div className="flex gap-2 justify-center pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          {step === "confirming" ? (
            <Button type="button" onClick={handleSendCode} disabled={loading}>
              {loading ? "Enviando..." : "Enviar código"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              style={{ borderColor: "rgba(248,113,113,0.4)", color: "var(--nexora-alert)" }}
              disabled={loading || code.length !== OTP_CODE_LENGTH}
              onClick={handleConfirm}
            >
              {loading ? "Eliminando..." : "Confirmar"}
            </Button>
          )}
        </div>

        {step === "otp-sent" && (
          <button
            type="button"
            disabled={loading}
            onClick={handleSendCode}
            className="text-[11px] transition-colors disabled:opacity-50"
            style={{ color: "var(--nexora-ink-dim)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nexora-nova)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--nexora-ink-dim)")}
          >
            Reenviar código
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

function DeleteCollaboratorButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: "var(--nexora-ink-dim)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nexora-alert)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--nexora-ink-dim)")}
      >
        <Trash2 size={14} />
        Eliminar
      </button>
      {open && (
        <DeleteCollaboratorModal
          name={name}
          onClose={() => setOpen(false)}
          onSendCode={() => requestDeleteCollaboratorOtpAction()}
          onConfirm={(code) => verifyAndDeleteCollaboratorAction(id, code)}
        />
      )}
    </>
  );
}

// Activar/desactivar es reversible (a diferencia de eliminar) — sin OTP,
// solo el toggle. getSessionProfile() ya filtra por is_active al resolver
// la sesión, así que desactivar corta el acceso al panel en la siguiente
// request del colaborador sin bloqueo adicional acá.
function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    const result = await setCollaboratorActiveAction(id, !active);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={handleToggle}
        className="text-xs transition-colors disabled:opacity-50"
        style={{ color: 'var(--nexora-ink-dim)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nexora-nova)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nexora-ink-dim)')}
      >
        {loading ? "..." : active ? "Desactivar" : "Activar"}
      </button>
      {error && <span className="text-xs" style={{ color: 'var(--nexora-alert)' }}>{error}</span>}
    </div>
  );
}

export function CollaboratorsTable({
  collaborators,
}: {
  collaborators: CollaboratorListItem[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = collaborators.find((c) => c.id === editingId) ?? null;

  if (editing) {
    return <CollaboratorForm editingCollaborator={editing} onDone={() => setEditingId(null)} />;
  }

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
              <TableHead>Última conexión</TableHead>
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
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{c.phone ? formatPhoneDisplay(c.phone) : "—"}</TableCell>
                <TableCell>
                  <ModulePills permissions={c.permissions} />
                </TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>
                  {c.lastSignInAt ? formatShortDateTime(c.lastSignInAt) : "Nunca ha entrado"}
                </TableCell>
                <TableCell>
                  <StatusBadge active={c.is_active} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingId(c.id)}
                        className="text-xs transition-colors"
                        style={{ color: 'var(--nexora-ink-dim)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nexora-nova)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nexora-ink-dim)')}
                      >
                        Editar
                      </button>
                      <ToggleActiveButton id={c.id} active={c.is_active} />
                      <DeleteCollaboratorButton id={c.id} name={c.full_name ?? c.email} />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {collaborators.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
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
