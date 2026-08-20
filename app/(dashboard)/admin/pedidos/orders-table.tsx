"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, Package, Receipt, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrderStatusAction, rejectOrderAction } from "./actions";
import {
  ALLOWED_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from "@/lib/types/order";
import { formatShortDateTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { InfoRow } from "@/components/dashboard/shared/InfoRow";

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--nexora-nova)",
  confirmed: "var(--nexora-nova)",
  shipped: "var(--nexora-signal)",
  picked_up: "var(--nexora-signal)",
  rejected: "var(--nexora-alert)",
};

// Exportado a propósito: el detalle de cliente en Clientes (CRM ligero)
// reutiliza este mismo indicador de estado para su historial de pedidos
// en vez de duplicar el mapa de colores.
type DateFilter = "all" | "today" | "7d" | "30d";

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "today", label: "Hoy" },
  { key: "7d", label: "Últimos 7 días" },
  { key: "30d", label: "Este mes" },
];

function matchesDateFilter(createdAt: string, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const createdMs = new Date(createdAt).getTime();
  const now = Date.now();
  const days = filter === "today" ? 1 : filter === "7d" ? 7 : 30;
  return now - createdMs <= days * 24 * 60 * 60 * 1000;
}

export function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'var(--nexora-ink-dim)';
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
    </span>
  );
}

// Recibe los pedidos YA filtrados por quien llama (pedidos-panel.tsx
// separa activos/finalizados/rechazados) — esta vista solo dibuja la
// grilla + el detalle de lo que le llegue. La numeración de "Pedido #N"
// es fija por orden de creación (viene ya calculada desde
// pedidos-panel.tsx) — no cambia aunque el pedido cambie de sección.
export function OrdersTable({
  orders,
  orderNumbers,
  countryIso2,
  title,
  emptyMessage = "No hay pedidos acá.",
  onDetailChange,
}: {
  orders: Order[];
  orderNumbers: Map<string, number>;
  countryIso2: string | null;
  title: string;
  emptyMessage?: string;
  // El panel que envuelve esto (pedidos-panel.tsx) tiene su propio botón
  // "Volver" (a la categoría anterior) — sin esto, quedaban dos botones
  // de volver visibles a la vez al abrir el detalle de un pedido.
  onDetailChange?: (viewingDetail: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  // Busca por número de pedido, producto Y ahora también por nombre/teléfono
  // del cliente (getOrders() ya trae ese dato con un join a customers).
  const searchedOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const number = orderNumbers.get(o.id);
      if (number !== undefined && String(number).includes(q)) return true;
      if (o.customer_name?.toLowerCase().includes(q)) return true;
      if (o.customer_phone?.toLowerCase().includes(q)) return true;
      return o.items.some((item) => item.name.toLowerCase().includes(q));
    });
  }, [orders, orderNumbers, query]);

  const filteredOrders = useMemo(
    () => searchedOrders.filter((o) => matchesDateFilter(o.created_at, dateFilter)),
    [searchedOrders, dateFilter]
  );

  function openDetail(id: string) {
    setSelectedId(id);
    onDetailChange?.(true);
  }

  function closeDetail() {
    setSelectedId(null);
    onDetailChange?.(false);
  }

  if (selected) {
    return (
      <OrderDetailView
        order={selected}
        number={orderNumbers.get(selected.id) ?? 0}
        countryIso2={countryIso2}
        onBack={closeDetail}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-nexora text-lg text-center" style={{ color: 'var(--nexora-ink)' }}>
        {title}
      </h2>

      {orders.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          {emptyMessage}
        </p>
      ) : (
        <>
          {/* Ícono e input como hermanos en flex con gap — ver misma nota
              en catalogo/products-table.tsx. */}
          <div
            className="flex items-center gap-2 max-w-sm mx-auto h-8 rounded-lg border border-input bg-transparent px-2.5"
          >
            <Search
              size={14}
              strokeWidth={1.75}
              className="shrink-0 pointer-events-none"
              style={{ color: 'var(--nexora-ink-dim)' }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por # de pedido o producto..."
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              style={{ color: 'var(--nexora-ink)' }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setDateFilter(f.key)}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={
                  dateFilter === f.key
                    ? { background: 'var(--nexora-nova)', color: 'var(--nexora-nova-ink)' }
                    : { background: 'rgba(238,240,247,0.08)', color: 'var(--nexora-ink-dim)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
              {query ? `Ningún pedido coincide con "${query}".` : "Ningún pedido coincide con este filtro de fecha."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredOrders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  number={orderNumbers.get(o.id) ?? 0}
                  countryIso2={countryIso2}
                  onClick={() => openDetail(o.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderCard({
  order,
  number,
  countryIso2,
  onClick,
}: {
  order: Order;
  number: number;
  countryIso2: string | null;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="aspect-square flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 text-center transition-all duration-300 hover:scale-105"
      style={{ borderColor: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)' }}
    >
      <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--nexora-ink-dim)' }}>
        Pedido
      </span>
      <span className="text-2xl font-semibold" style={{ color: 'var(--nexora-ink)' }}>
        #{number}
      </span>
      <span className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
        {formatCurrency(order.total, countryIso2)}
      </span>
      {order.customer_name && (
        <span className="text-[11px] truncate max-w-full px-1" style={{ color: 'var(--nexora-ink-dim)' }}>
          {order.customer_name}
        </span>
      )}
      <StatusDot status={order.status} />
    </button>
  );
}

function OrderDetailView({
  order,
  number,
  countryIso2,
  onBack,
}: {
  order: Order;
  number: number;
  countryIso2: string | null;
  onBack: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const status = order.status as OrderStatus;
  const nextStatuses = ALLOWED_STATUS_TRANSITIONS[status] ?? [];
  const canReject = nextStatuses.includes("rejected");
  const canAdvance = nextStatuses.filter((s) => s !== "rejected");
  const hasChoices = canAdvance.length > 0 || canReject;

  async function handleSelectChange(value: string | null) {
    if (!value || value === status) return;
    if (value === "rejected") {
      setRejecting(true);
      setError(null);
      return;
    }
    setUpdating(true);
    setError(null);
    const result = await updateOrderStatusAction(order.id, value as OrderStatus);
    setUpdating(false);
    if (result.error) setError(result.error);
  }

  async function handleConfirmReject() {
    if (!reason.trim()) {
      setError("Escribe el motivo del rechazo");
      return;
    }
    setUpdating(true);
    setError(null);
    const result = await rejectOrderAction(order.id, reason);
    setUpdating(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRejecting(false);
  }

  return (
    <div className="space-y-8">
      <div className="relative flex items-center justify-center">
        <button
          onClick={onBack}
          className="absolute left-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
          style={{ color: 'var(--nexora-ink-dim)' }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>
      </div>

      <div className="text-center space-y-2">
        <h2 className="font-nexora text-3xl font-semibold" style={{ color: 'var(--nexora-ink)' }}>
          Pedido #{number}
        </h2>
        <StatusDot status={order.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <section className="rounded-2xl border p-8 space-y-6 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center gap-2">
            <Package size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
            <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
              Productos
            </h3>
          </div>
          <div className="space-y-3 text-left">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
                <span>{item.quantity}× {item.name}</span>
                <span style={{ color: 'var(--nexora-ink)' }}>
                  {formatCurrency(item.quantity * item.unit_price, countryIso2)}
                </span>
              </div>
            ))}
            <div
              className="flex justify-between text-sm font-semibold pt-3 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--nexora-ink)' }}
            >
              <span>Total</span>
              <span>{formatCurrency(order.total, countryIso2)}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-8 space-y-6 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center gap-2">
            <Receipt size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
            <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
              Detalles
            </h3>
          </div>
          <div className="space-y-5">
            <InfoRow label="Cliente" value={order.customer_name ?? "Sin identificar"} />
            {order.customer_phone && <InfoRow label="Teléfono" value={order.customer_phone} />}
            <InfoRow label="Fecha" value={formatShortDateTime(order.created_at)} />
            <div>
              <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
                Comprobante
              </dt>
              <dd className="mt-1.5">
                {order.payment_proof_url ? (
                  <a
                    href={order.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium underline"
                    style={{ color: 'var(--nexora-nova)' }}
                  >
                    Ver comprobante de pago
                  </a>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
                    Sin adjuntar todavía
                  </span>
                )}
              </dd>
            </div>
          </div>
        </section>
      </div>

      {status === "rejected" && order.rejection_reason && (
        <p className="text-sm text-center max-w-md mx-auto" style={{ color: 'var(--nexora-alert)' }}>
          Rechazado: {order.rejection_reason}
        </p>
      )}

      {hasChoices && (
        <div className="max-w-xs mx-auto space-y-2">
          <Label className="block text-center">Estado del pedido</Label>
          <Select value={status} onValueChange={handleSelectChange} disabled={updating}>
            <SelectTrigger className="w-full justify-center">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={status}>{ORDER_STATUS_LABELS[status]}</SelectItem>
              {canAdvance.map((next) => (
                <SelectItem key={next} value={next}>
                  {status === "pending" ? "Aceptar" : ORDER_STATUS_LABELS[next]}
                </SelectItem>
              ))}
              {canReject && (
                <SelectItem value="rejected">
                  Rechazar
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {rejecting && (
        <div className="max-w-sm mx-auto space-y-3 rounded-2xl border p-5" style={{ borderColor: 'rgba(248,113,113,0.25)' }}>
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={16} style={{ color: 'var(--nexora-alert)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--nexora-alert)' }}>
              Rechazar este pedido
            </p>
          </div>
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo del rechazo (obligatorio)"
          />
          <div className="flex justify-center gap-2">
            <Button
              disabled={updating}
              variant="outline"
              style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--nexora-alert)' }}
              onClick={handleConfirmReject}
            >
              {updating ? "Rechazando..." : "Confirmar rechazo"}
            </Button>
            <Button variant="outline" disabled={updating} onClick={() => setRejecting(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!hasChoices && !rejecting && (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          Este pedido ya está finalizado.
        </p>
      )}

      {error && <p className="text-sm text-center" style={{ color: 'var(--nexora-alert)' }}>{error}</p>}
    </div>
  );
}

