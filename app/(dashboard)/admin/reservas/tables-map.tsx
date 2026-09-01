"use client";

// Plano del salón — cada mesa se dibuja con sus sillas a los lados y su
// número. Tocar una abre el editor (nombre, sillas, eliminar). El "+"
// agrega una mesa nueva. Todo se guarda en `booking_resources`
// (kind='table', name = número/nombre, capacity = sillas) — el agente lee
// esa misma tabla para hablar con el cliente.
import { useState, useTransition } from "react";
import { Plus, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingResource } from "@/lib/types/reservation";
import { createResourceAction, updateResourceAction, deleteResourceAction } from "./actions";

type Feed = { kind: "ok" | "error"; text: string } | null;

// Sillas parejas a los lados; si la capacidad es impar, la que sobra va a
// la cabecera (abajo). Ej. 7 → 3 y 3 a los lados + 1 abajo.
function seatLayout(capacity: number): { side: number; head: number } {
  const c = Math.max(1, Math.min(capacity, 16));
  const head = c % 2;
  return { side: (c - head) / 2, head };
}

function seatColumn(n: number, color: string) {
  return (
    <div className="flex flex-col justify-center gap-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="h-7 w-4 shrink-0 rounded-[5px]" style={{ background: color }} />
      ))}
    </div>
  );
}

function TableGlyph({ capacity, number, active }: { capacity: number; number: number; active: boolean }) {
  const { side, head } = seatLayout(capacity);
  const rows = Math.max(side, 1);
  const seatColor = active ? "#A5B4FC" : "#3B3F52";
  const tableBg = active ? "rgba(129,140,248,0.30)" : "#242838";
  const tableBorder = active ? "#818CF8" : "#3B3F52";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-stretch justify-center gap-1.5">
        {seatColumn(side, seatColor)}
        <div
          className="relative flex w-16 items-center justify-center rounded-2xl"
          style={{ minHeight: `${rows * 34}px`, background: tableBg, border: `1.5px solid ${tableBorder}` }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <span className="aventhra-iridescent font-nexora text-sm font-extrabold leading-none">{number}</span>
          </span>
        </div>
        {seatColumn(side, seatColor)}
      </div>
      {head === 1 && <span className="h-4 w-7 shrink-0 rounded-[5px]" style={{ background: seatColor }} />}
    </div>
  );
}

export function TablesMap({
  tables,
  onAdd,
  onUpdate,
  onRemove,
}: {
  tables: BookingResource[];
  onAdd: (r: BookingResource) => void;
  onUpdate: (r: BookingResource) => void;
  onRemove: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feed>(null);
  const [pending, start] = useTransition();

  function addTable() {
    setFeedback(null);
    const nextNum = tables.length + 1;
    start(async () => {
      const result = await createResourceAction({ kind: "table", name: `Mesa ${nextNum}`, capacity: 4 });
      if (result.error || !result.data) {
        setFeedback({ kind: "error", text: result.error ?? "No se pudo agregar." });
        return;
      }
      onAdd(result.data);
      setEditingId(result.data.id);
    });
  }

  const totalSeats = tables.reduce((s, t) => s + (t.capacity ?? 0), 0);

  return (
    <div className="space-y-4">
      <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
        {tables.length === 0
          ? "Tu salón está vacío — agrega tus mesas."
          : `${tables.length} mesa${tables.length === 1 ? "" : "s"} · ${totalSeats} sillas en total`}
      </p>

      {/* Salón — usa todo el ancho; las mesas se reparten solas */}
      <div
        className="grid justify-items-center gap-8 rounded-3xl border p-6 sm:p-10"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          borderColor: "#2A2E3E",
          background:
            "radial-gradient(circle at 30% 20%, rgba(129,140,248,0.05), transparent 55%), repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 44px), #0C0D14",
        }}
      >
        {tables.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setEditingId((cur) => (cur === t.id ? null : t.id))}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border p-4 transition-all hover:bg-white/[0.03]"
            style={{ borderColor: editingId === t.id ? "#818CF8" : "transparent" }}
          >
            <TableGlyph capacity={t.capacity ?? 4} number={i + 1} active={editingId === t.id} />
            <span className="text-xs font-medium" style={{ color: "var(--nexora-ink)" }}>
              {t.name !== `Mesa ${i + 1}` ? t.name : `Mesa ${i + 1}`}
            </span>
            <span className="-mt-2 text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>
              {t.capacity ?? 4} sillas
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={addTable}
          disabled={pending}
          className="flex w-full flex-col items-center justify-center gap-2 self-center rounded-2xl border border-dashed py-10 text-sm transition-colors hover:bg-white/[0.03] disabled:opacity-50"
          style={{ borderColor: "#3B3F52", color: "var(--nexora-ink-dim)" }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(129,140,248,0.15)" }}>
            <Plus size={20} strokeWidth={2.5} style={{ color: "#A5B4FC" }} />
          </span>
          Agregar mesa
        </button>
      </div>

      {editingId && (
        <TableEditor
          table={tables.find((t) => t.id === editingId)!}
          onSaved={onUpdate}
          onRemoved={(id) => {
            onRemove(id);
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
        />
      )}

      {feedback && (
        <p
          className="mx-auto max-w-sm rounded-lg border p-2.5 text-center text-xs"
          style={{ borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "var(--nexora-alert)" }}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

function TableEditor({
  table,
  onSaved,
  onRemoved,
  onClose,
}: {
  table: BookingResource;
  onSaved: (r: BookingResource) => void;
  onRemoved: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(table.name);
  const [capacity, setCapacity] = useState(table.capacity ?? 4);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    const finalName = name.trim() || table.name;
    start(async () => {
      const result = await updateResourceAction(table.id, { name: finalName, capacity });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved({ ...table, name: finalName, capacity });
      onClose();
    });
  }
  function remove() {
    setError(null);
    start(async () => {
      const result = await deleteResourceAction(table.id);
      if (result.error) setError(result.error);
      else onRemoved(table.id);
    });
  }

  return (
    <div
      className="mx-auto max-w-sm space-y-4 rounded-xl border p-4"
      style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
          Editar mesa
        </span>
        <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-white/[0.06]" style={{ color: "var(--nexora-ink-dim)" }}>
          <X size={14} />
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="block text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Nombre / número
        </label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-center" placeholder="Mesa 1" />
      </div>

      <div className="space-y-1.5">
        <label className="block text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Sillas
        </label>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCapacity((c) => Math.max(1, c - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border"
            style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
          >
            <Minus size={15} />
          </button>
          <span className="w-10 text-center text-xl font-semibold" style={{ color: "var(--nexora-ink)" }}>
            {capacity}
          </span>
          <button
            type="button"
            onClick={() => setCapacity((c) => Math.min(16, c + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border"
            style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-center text-xs" style={{ color: "var(--nexora-alert)" }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-center gap-4">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "..." : "Guardar"}
        </Button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="text-xs underline underline-offset-2"
          style={{ color: "var(--nexora-alert)" }}
        >
          Eliminar mesa
        </button>
      </div>
    </div>
  );
}
