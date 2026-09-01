"use client";

// Plano del salón — fondo claro tipo plano de restaurante. Cada mesa se
// dibuja con sus sillas (parejas a los lados, la impar a la cabecera) y su
// número en el degradado de la landing. Tocar una mesa (o "Agregar mesa")
// abre una ventana centrada donde el dibujo se actualiza en tiempo real.
// Todo vive en `booking_resources` (kind='table', name, capacity) — el
// agente lee esa misma tabla.
import { useEffect, useState, useTransition } from "react";
import { Plus, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingResource } from "@/lib/types/reservation";
import { createResourceAction, updateResourceAction, deleteResourceAction } from "./actions";

type Feed = { kind: "ok" | "error"; text: string } | null;

// Sillas parejas a los lados; la impar va a la cabecera (abajo). 7 → 3+3+1.
function seatLayout(capacity: number): { side: number; head: number } {
  const c = Math.max(1, Math.min(capacity, 16));
  const head = c % 2;
  return { side: (c - head) / 2, head };
}

function TableGlyph({
  capacity,
  number,
  active = false,
  size = 1,
}: {
  capacity: number;
  number: number;
  active?: boolean;
  size?: number;
}) {
  const { side, head } = seatLayout(capacity);
  const rows = Math.max(side, 1);
  const seatH = 28 * size;
  const seatW = 16 * size;
  const gap = 6 * size;
  const tableW = 64 * size;
  const seatColor = active ? "#818CF8" : "#C7CBD6";

  const seatCol = (
    <div className="flex flex-col justify-center" style={{ gap }}>
      {Array.from({ length: side }).map((_, i) => (
        <span key={i} className="shrink-0 rounded-[5px]" style={{ height: seatH, width: seatW, background: seatColor }} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col items-center" style={{ gap }}>
      <div className="flex items-stretch justify-center" style={{ gap }}>
        {seatCol}
        <div
          className="relative flex items-center justify-center rounded-2xl"
          style={{
            width: tableW,
            minHeight: rows * (seatH + gap),
            background: active ? "rgba(129,140,248,0.18)" : "#2A2E3C",
            border: `1.5px solid ${active ? "#818CF8" : "#2A2E3C"}`,
          }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{ height: 32 * size, width: 32 * size, background: "rgba(255,255,255,0.92)" }}
          >
            <span
              className="aventhra-iridescent font-nexora font-extrabold leading-none"
              style={{ fontSize: 14 * size }}
            >
              {number}
            </span>
          </span>
        </div>
        <div className="flex flex-col justify-center" style={{ gap }}>
          {Array.from({ length: side }).map((_, i) => (
            <span key={i} className="shrink-0 rounded-[5px]" style={{ height: seatH, width: seatW, background: seatColor }} />
          ))}
        </div>
      </div>
      {head === 1 && <span className="shrink-0 rounded-[5px]" style={{ height: seatW, width: seatH, background: seatColor }} />}
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
  const editingIndex = tables.findIndex((t) => t.id === editingId);
  const editing = editingIndex >= 0 ? tables[editingIndex] : null;

  return (
    <div className="space-y-4">
      <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
        {tables.length === 0
          ? "Tu salón está vacío — agrega tus mesas."
          : `${tables.length} mesa${tables.length === 1 ? "" : "s"} · ${totalSeats} sillas en total`}
      </p>

      {/* Salón — fondo claro; las mesas van juntas al centro */}
      <div
        className="flex flex-wrap content-center items-center justify-center gap-x-2 gap-y-6 rounded-3xl p-6 sm:p-10"
        style={{
          minHeight: "17rem",
          background:
            "repeating-linear-gradient(0deg, rgba(15,23,42,0.045) 0 1px, transparent 1px 46px), repeating-linear-gradient(90deg, rgba(15,23,42,0.045) 0 1px, transparent 1px 46px), linear-gradient(180deg, #FFFFFF, #EEF1F6)",
          boxShadow: "0 12px 44px -14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
      >
        {tables.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setEditingId(t.id)}
            className="flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition-colors hover:bg-black/[0.04]"
            style={{ borderColor: editingId === t.id ? "#818CF8" : "transparent" }}
          >
            <TableGlyph capacity={t.capacity ?? 4} number={i + 1} active={editingId === t.id} size={0.78} />
            <span className="text-sm font-semibold" style={{ color: "#1C2434" }}>
              {t.name !== `Mesa ${i + 1}` ? t.name : `Mesa ${i + 1}`}
            </span>
            <span className="-mt-1.5 text-[11px]" style={{ color: "#6B7280" }}>
              {t.capacity ?? 4} sillas
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={addTable}
          disabled={pending}
          className="flex h-36 w-36 flex-col items-center justify-center gap-2 self-center rounded-2xl border-2 border-dashed text-sm font-medium transition-colors hover:bg-black/[0.04] disabled:opacity-50"
          style={{ borderColor: "rgba(15,23,42,0.2)", color: "#4B5563" }}
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "rgba(129,140,248,0.16)" }}
          >
            <Plus size={22} strokeWidth={2.5} style={{ color: "#6366F1" }} />
          </span>
          Agregar mesa
        </button>
      </div>

      {feedback && (
        <p
          className="mx-auto max-w-sm rounded-lg border p-2.5 text-center text-xs"
          style={{ borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "var(--nexora-alert)" }}
        >
          {feedback.text}
        </p>
      )}

      {editing && (
        <TableEditorModal
          table={editing}
          number={editingIndex + 1}
          defaultName={`Mesa ${editingIndex + 1}`}
          onSaved={onUpdate}
          onRemoved={(id) => {
            onRemove(id);
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

function TableEditorModal({
  table,
  number,
  defaultName,
  onSaved,
  onRemoved,
  onClose,
}: {
  table: BookingResource;
  number: number;
  defaultName: string;
  onSaved: (r: BookingResource) => void;
  onRemoved: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(table.name);
  const [capacity, setCapacity] = useState(table.capacity ?? 4);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = name.trim() || defaultName;

  function save() {
    setError(null);
    const finalName = name.trim() || defaultName;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-5 rounded-2xl border p-6"
        style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center">
          <span className="font-nexora text-base font-semibold" style={{ color: "var(--nexora-ink)" }}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 rounded-md p-1 transition-colors hover:bg-white/[0.06]"
            style={{ color: "var(--nexora-ink-dim)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Dibujo en tiempo real — refleja el número y las sillas actuales */}
        <div className="flex justify-center py-2">
          <TableGlyph capacity={capacity} number={number} active size={0.9} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            Nombre o número
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-center" placeholder={defaultName} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
            Sillas
          </label>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCapacity((c) => Math.max(1, c - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border"
              style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
            >
              <Minus size={16} />
            </button>
            <span className="w-12 text-center text-2xl font-bold" style={{ color: "var(--nexora-ink)" }}>
              {capacity}
            </span>
            <button
              type="button"
              onClick={() => setCapacity((c) => Math.min(16, c + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border"
              style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {error && (
          <p className="text-center text-xs" style={{ color: "var(--nexora-alert)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-center gap-4 pt-1">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
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
    </div>
  );
}
