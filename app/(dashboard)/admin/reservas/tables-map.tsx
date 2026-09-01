"use client";

// Plano del salón editable — piso casi negro, cada mesa se arrastra a su
// lugar, se rota, y se toca para editar nombre/sillas. Posición y rotación
// se guardan en booking_resources (pos_x/pos_y en permille del canvas,
// rotation en grados). El agente sigue leyendo name + capacity.
import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, X, Minus, RotateCw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingResource } from "@/lib/types/reservation";
import {
  createResourceAction,
  updateResourceAction,
  updateResourceLayoutAction,
  deleteResourceAction,
} from "./actions";

type Feed = { kind: "ok" | "error"; text: string } | null;

// Colores: piso casi negro, mesa/silla en gris medio (comparten fondo y borde).
const FLOOR_BG =
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 44px), radial-gradient(circle at 50% 0%, #1b1d24, #101116)";
const SURFACE = "#454B58";
const SURFACE_BORDER = "#5A6170";

// Reparte las sillas: siempre que se pueda, una en cada cabecera (arriba y
// abajo) y el resto parejo a los lados. 4 → una en cada uno de los 4 lados.
// 6 → 2+2 lados + 1+1 cabeceras. 5 → 2+2 lados + 1 cabecera.
function seatLayout(capacity: number): { side: number; headTop: number; headBottom: number } {
  const c = Math.max(1, Math.min(capacity, 16));
  let heads: number;
  if (c === 1) heads = 1;
  else if (c === 2) heads = 0;
  else if (c % 2 === 0) heads = 2;
  else heads = 1;
  const side = (c - heads) / 2;
  return { side, headTop: heads === 2 ? 1 : 0, headBottom: heads >= 1 ? 1 : 0 };
}

function glyphLabel(name: string, index: number): string {
  const num = name.match(/\d+/);
  if (num) return num[0];
  const t = name.trim();
  return t ? t.slice(0, 3) : String(index);
}

function TableGlyph({
  capacity,
  number,
  size = 1,
  counterRotate = 0,
}: {
  capacity: number;
  number: string | number;
  size?: number;
  counterRotate?: number;
}) {
  const { side, headTop, headBottom } = seatLayout(capacity);
  const rows = Math.max(side, 1);
  const seatH = 26 * size;
  const seatW = 15 * size;
  const gap = 5 * size;
  const tableW = 58 * size;
  const seatStyle = { height: seatH, width: seatW, background: SURFACE, border: `1.5px solid ${SURFACE_BORDER}` };
  const headSeatStyle = { height: seatW, width: seatH, background: SURFACE, border: `1.5px solid ${SURFACE_BORDER}` };
  const label = String(number);

  return (
    <div className="flex select-none flex-col items-center" style={{ gap }}>
      {headTop === 1 && <span className="shrink-0 rounded-[5px]" style={headSeatStyle} />}
      <div className="flex items-stretch justify-center" style={{ gap }}>
        <div className="flex flex-col justify-center" style={{ gap }}>
          {Array.from({ length: side }).map((_, i) => (
            <span key={i} className="shrink-0 rounded-[5px]" style={seatStyle} />
          ))}
        </div>
        <div
          className="relative flex items-center justify-center rounded-2xl"
          style={{ width: tableW, minHeight: rows * (seatH + gap), background: SURFACE, border: `1.5px solid ${SURFACE_BORDER}` }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              height: 30 * size,
              width: 30 * size,
              background: "rgba(255,255,255,0.92)",
              transform: counterRotate ? `rotate(${-counterRotate}deg)` : undefined,
            }}
          >
            <span
              className="aventhra-iridescent font-nexora font-extrabold leading-none"
              style={{ fontSize: (label.length > 1 ? 9 : 13) * size }}
            >
              {label}
            </span>
          </span>
        </div>
        <div className="flex flex-col justify-center" style={{ gap }}>
          {Array.from({ length: side }).map((_, i) => (
            <span key={i} className="shrink-0 rounded-[5px]" style={seatStyle} />
          ))}
        </div>
      </div>
      {headBottom === 1 && <span className="shrink-0 rounded-[5px]" style={headSeatStyle} />}
    </div>
  );
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Posición por defecto (permille) para una mesa que todavía no se colocó.
function autoPos(index: number): { x: number; y: number } {
  return { x: 110 + (index % 4) * 230, y: 160 + Math.floor(index / 4) * 220 };
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feed>(null);
  const [pending, start] = useTransition();

  // Posición local mientras se arrastra (permille). Al soltar se persiste y
  // se limpia para volver a usar el valor de la prop.
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  function posOf(t: BookingResource, i: number): { x: number; y: number } {
    return localPos[t.id] ?? (t.posX != null && t.posY != null ? { x: t.posX, y: t.posY } : autoPos(i));
  }

  function onPointerDown(e: React.PointerEvent, t: BookingResource, i: number) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = posOf(t, i);
    let moved = false;
    let last = origin;
    setDragId(t.id);
    setSelectedId(t.id);

    function move(ev: PointerEvent) {
      const dxPx = ev.clientX - startX;
      const dyPx = ev.clientY - startY;
      if (Math.abs(dxPx) > 4 || Math.abs(dyPx) > 4) moved = true;
      last = {
        x: clamp(origin.x + (dxPx / rect.width) * 1000, 45, 955),
        y: clamp(origin.y + (dyPx / rect.height) * 1000, 90, 940),
      };
      setLocalPos((p) => ({ ...p, [t.id]: last }));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragId(null);
      // Sin arrastre = solo seleccionar (ya se hizo en pointerdown). Para
      // editar hay que tocar el lápiz de la toolbar.
      if (!moved) return;
      updateResourceLayoutAction(t.id, { posX: last.x, posY: last.y });
      onUpdate({ ...t, posX: last.x, posY: last.y });
      setLocalPos((p) => {
        const n = { ...p };
        delete n[t.id];
        return n;
      });
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function rotate(t: BookingResource) {
    const next = ((t.rotation ?? 0) + 90) % 360;
    onUpdate({ ...t, rotation: next });
    updateResourceLayoutAction(t.id, { rotation: next });
  }

  function addTable() {
    setFeedback(null);
    const i = tables.length;
    const p = autoPos(i);
    start(async () => {
      const result = await createResourceAction({ kind: "table", name: `Mesa ${i + 1}`, capacity: 4 });
      if (result.error || !result.data) {
        setFeedback({ kind: "error", text: result.error ?? "No se pudo agregar." });
        return;
      }
      const placed = { ...result.data, posX: p.x, posY: p.y };
      onAdd(placed);
      updateResourceLayoutAction(placed.id, { posX: p.x, posY: p.y });
      setSelectedId(placed.id);
    });
  }

  const editingIndex = tables.findIndex((t) => t.id === editingId);
  const editing = editingIndex >= 0 ? tables[editingIndex] : null;

  return (
    <div className="space-y-4">
      {tables.length === 0 && (
        <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Tu salón está vacío — agrega tu primera mesa.
        </p>
      )}

      <div
        ref={canvasRef}
        onPointerDown={(e) => {
          if (e.target === canvasRef.current) setSelectedId(null);
        }}
        className="relative w-full overflow-hidden rounded-3xl"
        style={{ height: "32rem", background: FLOOR_BG, boxShadow: "inset 0 0 60px rgba(0,0,0,0.55)" }}
      >
        {tables.map((t, i) => {
          const p = posOf(t, i);
          const isSel = selectedId === t.id;
          return (
            <div
              key={t.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(p.x / 1000) * 100}%`,
                top: `${(p.y / 1000) * 100}%`,
                zIndex: dragId === t.id ? 30 : isSel ? 20 : 10,
                cursor: dragId === t.id ? "grabbing" : "grab",
              }}
            >
              {/* toolbar de la mesa seleccionada — flota bien arriba, fuera
                  de la rotación y de las sillas de la cabecera */}
              {isSel && (
                <div
                  className="absolute bottom-full left-1/2 z-40 mb-3 flex -translate-x-1/2 gap-1 rounded-xl border p-1"
                  style={{
                    borderColor: "#3A3F4C",
                    background: "#1E2029",
                    boxShadow: "0 10px 24px -6px rgba(0,0,0,0.6)",
                  }}
                >
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => rotate(t)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.08]"
                    style={{ color: "var(--nexora-ink)" }}
                    title="Rotar"
                  >
                    <RotateCw size={15} />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setEditingId(t.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.08]"
                    style={{ color: "var(--nexora-ink)" }}
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              )}

              <div
                onPointerDown={(e) => onPointerDown(e, t, i)}
                className="rounded-2xl p-1 transition-shadow"
                style={{
                  transform: `rotate(${t.rotation ?? 0}deg)`,
                  boxShadow: isSel ? "0 0 0 2px #818CF8" : undefined,
                  borderRadius: 18,
                }}
              >
                <TableGlyph
                  capacity={t.capacity ?? 4}
                  number={glyphLabel(t.name, i + 1)}
                  size={0.9}
                  counterRotate={t.rotation ?? 0}
                />
              </div>

              <div
                className="mt-1 text-center text-[11px] font-medium"
                style={{ color: "var(--nexora-ink-dim)", transform: "none" }}
              >
                {t.name} · {t.capacity ?? 4}
              </div>
            </div>
          );
        })}

        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
              Agrega mesas abajo y arrástralas acá.
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button type="button" variant="outline" size="sm" onClick={addTable} disabled={pending}>
          <Plus size={14} strokeWidth={2} /> Agregar mesa
        </Button>
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
            setSelectedId(null);
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
            {name.trim() || defaultName}
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

        <div className="flex justify-center py-2">
          <TableGlyph capacity={capacity} number={glyphLabel(name, number)} size={0.9} />
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
