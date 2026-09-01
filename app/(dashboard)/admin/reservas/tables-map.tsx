"use client";

// Mapa visual de mesas — cada mesa se dibuja con sus sillas alrededor,
// numerada. Tocar una abre su editor (nombre, sillas, eliminar). El "+"
// agrega una mesa nueva.
import { useState, useTransition } from "react";
import { Plus, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingResource } from "@/lib/types/reservation";
import { createResourceAction, updateResourceAction, deleteResourceAction } from "./actions";

type Feed = { kind: "ok" | "error"; text: string } | null;

// Sillas repartidas arriba/abajo. Capacidad 4 → 2 y 2; 5 → 3 y 2.
function seatSplit(capacity: number): [number, number] {
  const c = Math.max(1, Math.min(capacity, 12));
  return [Math.ceil(c / 2), Math.floor(c / 2)];
}

function TableGlyph({ capacity, active }: { capacity: number; active: boolean }) {
  const [top, bottom] = seatSplit(capacity);
  const seat = "h-3.5 w-2.5 rounded-[3px]";
  const seatStyle = { background: active ? "rgba(129,140,248,0.55)" : "rgba(255,255,255,0.12)" };
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {Array.from({ length: top }).map((_, i) => (
          <span key={i} className={seat} style={seatStyle} />
        ))}
      </div>
      <div
        className="h-10 w-16 rounded-lg"
        style={{
          background: active ? "rgba(129,140,248,0.22)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${active ? "rgba(129,140,248,0.5)" : "var(--nexora-line)"}`,
        }}
      />
      <div className="flex gap-1">
        {Array.from({ length: bottom }).map((_, i) => (
          <span key={i} className={seat} style={seatStyle} />
        ))}
      </div>
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tables.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setEditingId((cur) => (cur === t.id ? null : t.id))}
            className="relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-white/[0.03]"
            style={{
              borderColor: editingId === t.id ? "var(--nexora-nova)" : "var(--nexora-line)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span
              className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{ background: "#818CF8", color: "#0b0b10" }}
            >
              {i + 1}
            </span>
            <TableGlyph capacity={t.capacity ?? 4} active={editingId === t.id} />
            <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
              {t.capacity ?? 4} sillas
            </span>
            {t.name !== `Mesa ${i + 1}` && (
              <span className="max-w-full truncate text-[11px]" style={{ color: "var(--nexora-ink)" }}>
                {t.name}
              </span>
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={addTable}
          disabled={pending}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm transition-colors hover:bg-white/[0.03] disabled:opacity-50"
          style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)", minHeight: "8rem" }}
        >
          <Plus size={18} strokeWidth={2} />
          Agregar mesa
        </button>
      </div>

      {editingId && (
        <TableEditor
          table={tables.find((t) => t.id === editingId)!}
          onSaved={(r) => {
            onUpdate(r);
          }}
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
    start(async () => {
      const result = await updateResourceAction(table.id, { name: name.trim() || table.name, capacity });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved({ ...table, name: name.trim() || table.name, capacity });
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
          Nombre
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
            className="flex h-8 w-8 items-center justify-center rounded-lg border"
            style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
          >
            <Minus size={14} />
          </button>
          <span className="w-8 text-center text-lg font-semibold" style={{ color: "var(--nexora-ink)" }}>
            {capacity}
          </span>
          <button
            type="button"
            onClick={() => setCapacity((c) => Math.min(12, c + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border"
            style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-center text-xs" style={{ color: "var(--nexora-alert)" }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-center gap-3">
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
