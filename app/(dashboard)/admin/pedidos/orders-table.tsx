"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronLeft, Package, Receipt, AlertTriangle, Search, Download, ListFilter, Check, XCircle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { SlideToConfirm } from "@/components/shared/SlideToConfirm";
import { updateOrderStatusAction, rejectOrderAction } from "./actions";
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from "@/lib/types/order";
import {
  getOrderVocabulary,
  orderKindFor,
  type OrderVocabulary,
} from "@/lib/config/orderVocabulary";
import { formatShortDateTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { InfoRow } from "@/components/dashboard/shared/InfoRow";
import { toCsv, downloadCsv } from "@/lib/utils/csv";

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

// `label` opcional — Clientes (customer-detail-view) lo usa sin pasarlo y
// cae a ORDER_STATUS_LABELS; Pedidos le pasa la etiqueta según lo que
// ofrece el negocio (producto vs servicio).
export function StatusDot({ status, label }: { status: string; label?: string }) {
  const color = STATUS_COLOR[status] ?? 'var(--nexora-ink-dim)';
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label ?? ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
    </span>
  );
}

// Pastilla de estado para el encabezado del detalle — más presencia que el
// StatusDot suelto que se usa en las grillas.
function OrderStatusBadge({ status, vocab }: { status: OrderStatus; vocab: OrderVocabulary }) {
  const color = STATUS_COLOR[status] ?? 'var(--nexora-ink-dim)';
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide"
      style={{
        color,
        background: `color-mix(in oklch, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in oklch, ${color} 32%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {vocab.statusLabel[status]}
    </span>
  );
}

// Camino feliz de un pedido en 3 pasos. shipped y picked_up son el mismo
// paso final — solo cambia la etiqueta. rejected no es parte del camino,
// se muestra aparte. Las etiquetas salen del vocabulario (producto vs
// servicio).
function pipelineProgress(status: OrderStatus): number {
  if (status === "pending") return 0;
  if (status === "confirmed") return 1;
  return 3; // shipped | picked_up → los 3 pasos hechos
}

function OrderStatusPipeline({ status, vocab }: { status: OrderStatus; vocab: OrderVocabulary }) {
  if (status === "rejected") {
    return (
      <div
        className="mx-auto flex max-w-md items-center justify-center gap-2 text-sm font-medium"
        style={{ color: 'var(--nexora-alert)' }}
      >
        <XCircle size={16} strokeWidth={2} />
        {vocab.statusLabel.rejected}
      </div>
    );
  }

  const progress = pipelineProgress(status);
  const finalLabel =
    status === "shipped" || status === "picked_up"
      ? vocab.statusLabel[status]
      : vocab.steps[2];

  return (
    <div className="mx-auto flex max-w-md items-start">
      {vocab.steps.map((label, i) => {
        const done = i < progress;
        const active = i === progress;
        const shownLabel = i === 2 ? finalLabel : label;
        return (
          <Fragment key={label}>
            {i > 0 && (
              <span
                className="mt-3.5 h-px flex-1"
                style={{ background: i <= progress ? 'var(--nexora-signal)' : 'var(--nexora-line)' }}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
                style={{
                  background: done ? 'var(--nexora-signal)' : active ? 'var(--nexora-nova)' : 'transparent',
                  color: done ? '#04140d' : active ? 'var(--nexora-nova-ink)' : 'var(--nexora-ink-dim)',
                  border: done || active ? 'none' : '1px solid var(--nexora-line)',
                }}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className="whitespace-nowrap text-[11px] font-medium"
                style={{ color: active || done ? 'var(--nexora-ink)' : 'var(--nexora-ink-dim)' }}
              >
                {shownLabel}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
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
  industryType,
  title,
  emptyMessage = "No hay pedidos acá.",
  onDetailChange,
}: {
  orders: Order[];
  orderNumbers: Map<string, number>;
  countryIso2: string | null;
  industryType: string | null;
  title: string;
  emptyMessage?: string;
  // El panel que envuelve esto (pedidos-panel.tsx) tiene su propio botón
  // "Volver" (a la categoría anterior) — sin esto, quedaban dos botones
  // de volver visibles a la vez al abrir el detalle de un pedido.
  onDetailChange?: (viewingDetail: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Snapshot del pedido abierto. Al cambiar de estado, el pedido puede
  // salir de la categoría que esta grilla recibió (ej. confirmado →
  // recogido pasa de "activos" a "finalizados"); sin el snapshot el
  // detalle desaparecía de golpe y quedaba una grilla sin botón "Volver".
  const [openSnapshot, setOpenSnapshot] = useState<Order | null>(null);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const vocab = useMemo(
    () => getOrderVocabulary(orderKindFor(industryType)),
    [industryType]
  );

  const liveSelected = selectedId ? orders.find((o) => o.id === selectedId) ?? null : null;
  const selected = liveSelected ?? openSnapshot;

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

  // Exporta exactamente lo que se está viendo (respeta búsqueda + filtro
  // de fecha ya aplicados) — "exporta lo que tengo en pantalla", no todo
  // el historial sin importar el filtro.
  function handleExportCsv() {
    const rows = filteredOrders.map((o) => ({
      numero: orderNumbers.get(o.id) ?? "",
      cliente: o.customer_name ?? "Sin identificar",
      telefono: o.customer_phone ?? "",
      estado: vocab.statusLabel[o.status as OrderStatus] ?? o.status,
      productos: o.items.map((item) => `${item.quantity}x ${item.name}`).join(" | "),
      total: o.total,
      gestionado_por: o.updated_by_name ?? "",
      fecha: formatShortDateTime(o.created_at),
    }));
    const csv = toCsv(rows, [
      { key: "numero", label: "Número de pedido" },
      { key: "cliente", label: "Cliente" },
      { key: "telefono", label: "Teléfono" },
      { key: "estado", label: "Estado" },
      { key: "productos", label: "Productos" },
      { key: "total", label: "Total" },
      { key: "gestionado_por", label: "Gestionado por" },
      { key: "fecha", label: "Fecha" },
    ]);
    downloadCsv(`pedidos-${title.toLowerCase().replace(/\s+/g, "-")}`, csv);
  }

  function openDetail(order: Order) {
    setSelectedId(order.id);
    setOpenSnapshot(order);
    onDetailChange?.(true);
  }

  function closeDetail() {
    setSelectedId(null);
    setOpenSnapshot(null);
    onDetailChange?.(false);
  }

  if (selected) {
    return (
      <OrderDetailView
        order={selected}
        number={orderNumbers.get(selected.id) ?? 0}
        countryIso2={countryIso2}
        vocab={vocab}
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

          {/* Antes: 4 botones de pastilla siempre visibles (Todos/Hoy/
              Últimos 7 días/Este mes) — pedido explícito: un solo filtro
              unificado que muestre las opciones al tocarlo. Y dentro de
              eso, ajuste explícito: el botón SÍ debe reflejar lo elegido
              ("Hoy", "Últimos 7 días"...), pero cuando el filtro está en
              su estado neutro ("all", sin restricción real) debe decir
              "Filtra por días" en vez de "Todos" — como un placeholder.
              No se usa <SelectValue /> para esto: mismo bug real ya
              documentado en TagsSection (Clientes), Base UI muestra el
              value crudo ("all"), no el label. Se arma el texto a mano
              desde dateFilter en vez de depender de ese render. */}
          <div className="flex justify-center">
            <Select value={dateFilter} onValueChange={(v) => v && setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-48 justify-center gap-1.5">
                <ListFilter size={14} strokeWidth={1.75} />
                {dateFilter === "all"
                  ? "Filtra por días"
                  : DATE_FILTERS.find((f) => f.key === dateFilter)?.label}
              </SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={filteredOrders.length === 0}
              onClick={handleExportCsv}
            >
              <Download size={14} strokeWidth={1.75} />
              Exportar CSV
            </Button>
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
                  statusLabel={vocab.statusLabel[o.status as OrderStatus] ?? o.status}
                  onClick={() => openDetail(o)}
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
  statusLabel,
  onClick,
}: {
  order: Order;
  number: number;
  countryIso2: string | null;
  statusLabel: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const awaitingReview = order.status === "pending" && !!order.payment_proof_url;
  const fromReservation = !!order.reservation_id;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative aspect-square flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 text-center transition-all duration-300 hover:scale-105"
      style={{ borderColor: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)' }}
    >
      {awaitingReview && (
        <span
          className="absolute top-2 right-2 flex items-center justify-center rounded-full p-1"
          style={{ background: 'color-mix(in oklch, var(--nexora-nova) 18%, transparent)' }}
          title="Comprobante esperando revisión"
        >
          <Receipt size={11} strokeWidth={2} style={{ color: 'var(--nexora-nova)' }} />
        </span>
      )}
      {fromReservation && (
        <span
          className="absolute top-2 left-2 flex items-center justify-center rounded-full p-1"
          style={{ background: 'color-mix(in oklch, var(--nexora-nova) 18%, transparent)' }}
          title="Viene de un turno de Reservas"
        >
          <CalendarClock size={11} strokeWidth={2} style={{ color: 'var(--nexora-nova)' }} />
        </span>
      )}
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
      <StatusDot status={order.status} label={statusLabel} />
    </button>
  );
}

function OrderDetailView({
  order,
  number,
  countryIso2,
  vocab,
  onBack,
}: {
  order: Order;
  number: number;
  countryIso2: string | null;
  vocab: OrderVocabulary;
  onBack: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState<OrderStatus | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Estado optimista: tras un cambio exitoso, el pedido puede haber salido
  // de la categoría que la grilla recibió, así que `order` deja de
  // actualizarse. Se refleja el nuevo estado acá para que el pipeline, la
  // pastilla y el mensaje de cierre queden bien (y el botón "Volver" del
  // encabezado sigue disponible siempre).
  const [localStatus, setLocalStatus] = useState<OrderStatus | null>(null);

  const status = localStatus ?? (order.status as OrderStatus);
  const isTerminal = status === "shipped" || status === "picked_up" || status === "rejected";
  // Clientes creados desde el chat de prueba del agente usan `test-<uuid>`
  // como "teléfono" — no es un dato real, no se muestra como tal.
  const isInternalTest = order.customer_phone?.startsWith("test-") ?? false;

  async function advance(next: OrderStatus) {
    setPendingAction(next);
    setError(null);
    const result = await updateOrderStatusAction(order.id, next);
    setPendingAction(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLocalStatus(next);
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
    setLocalStatus("rejected");
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

      <div className="text-center space-y-3">
        <h2 className="font-nexora text-3xl font-semibold" style={{ color: 'var(--nexora-ink)' }}>
          Pedido #{number}
        </h2>
        <div>
          <OrderStatusBadge status={status} vocab={vocab} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <section className="rounded-2xl border p-8 space-y-6 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center gap-2">
            <Package size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
            <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
              {vocab.itemsHeading}
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
            <InfoRow
              label="Cliente"
              value={order.customer_name ?? (isInternalTest ? "Prueba del agente" : "Sin identificar")}
            />
            {order.customer_phone && !isInternalTest && (
              <InfoRow label="Teléfono" value={order.customer_phone} />
            )}
            <InfoRow label="Fecha" value={formatShortDateTime(order.created_at)} />
            {order.reservation_id && (
              <InfoRow
                label="Origen"
                value={
                  order.reservation_starts_at
                    ? `Turno de Reservas · ${formatShortDateTime(order.reservation_starts_at)}`
                    : "Turno de Reservas"
                }
              />
            )}
            {order.updated_by_name && (
              <InfoRow
                label={status === "rejected" ? "Rechazado por" : "Gestionado por"}
                value={order.updated_by_name}
              />
            )}
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

      {/* Zona de estado: la línea de progreso + la forma de avanzarlo.
          Van juntas para que se lean como un solo bloque de control. */}
      <div className="space-y-6">
        <OrderStatusPipeline status={status} vocab={vocab} />

        {status === "rejected" && (order.rejection_reason || reason) && (
          <p className="text-sm text-center max-w-md mx-auto" style={{ color: 'var(--nexora-alert)' }}>
            Motivo: {order.rejection_reason || reason}
          </p>
        )}

        {!isTerminal && !rejecting && (
          <div className="max-w-sm mx-auto space-y-3">
            {status === "pending" && (
              <>
                <SlideToConfirm
                  label={vocab.acceptLabel}
                  tone="success"
                  loading={pendingAction === "confirmed"}
                  disabled={pendingAction !== null}
                  onConfirm={() => advance("confirmed")}
                />
                <button
                  type="button"
                  onClick={() => { setError(null); setRejecting(true); }}
                  className="mx-auto block text-xs transition-colors disabled:opacity-50"
                  style={{ color: 'var(--nexora-ink-dim)' }}
                  disabled={pendingAction !== null}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nexora-alert)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nexora-ink-dim)')}
                >
                  {vocab.rejectLabel}
                </button>
              </>
            )}

            {status === "confirmed" &&
              vocab.advanceFromConfirmed.map((opt) => (
                <SlideToConfirm
                  key={opt.status}
                  label={opt.label}
                  tone="success"
                  loading={pendingAction === opt.status}
                  disabled={pendingAction !== null}
                  onConfirm={() => advance(opt.status)}
                />
              ))}

            <p className="text-center text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
              Deslizá el botón o tocalo para confirmar.
            </p>
          </div>
        )}
      </div>

      {rejecting && (
        <div className="max-w-sm mx-auto space-y-3 rounded-2xl border p-5" style={{ borderColor: 'rgba(248,113,113,0.25)' }}>
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={16} style={{ color: 'var(--nexora-alert)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--nexora-alert)' }}>
              {vocab.rejectPanelTitle}
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

      {(status === "shipped" || status === "picked_up") && !rejecting && (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          {vocab.finishedNote}
        </p>
      )}

      {error && <p className="text-sm text-center" style={{ color: 'var(--nexora-alert)' }}>{error}</p>}
    </div>
  );
}

