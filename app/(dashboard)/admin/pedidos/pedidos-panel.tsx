"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { OrdersTable } from "./orders-table";
import type { Order } from "@/lib/types/order";
import type { BookingMode } from "@/lib/types/reservation";

type View = "chooser" | "active" | "finished" | "rejected";

// Un pedido pasa de "activos" a "finalizados" solo cuando llega a un
// estado terminal (Enviado/Recogido) — ver ALLOWED_STATUS_TRANSITIONS en
// lib/types/order.ts. "Pedidos rechazados" es exclusivo del admin: un
// colaborador nunca ve esa opción en el chooser.
const ACTIVE_STATUSES = ["pending", "confirmed"];
const FINISHED_STATUSES = ["shipped", "picked_up"];

export function PedidosPanel({
  orders,
  countryIso2,
  industryType,
  bookingMode = "off",
  isAdmin,
}: {
  orders: Order[];
  countryIso2: string | null;
  industryType: string | null;
  bookingMode?: BookingMode;
  isAdmin: boolean;
}) {
  const [view, setView] = useState<View>("chooser");
  const [viewingDetail, setViewingDetail] = useState(false);

  function changeView(next: View) {
    setViewingDetail(false);
    setView(next);
  }

  // Numeración fija por orden de creación — "Pedido #3" es siempre el
  // mismo pedido, sin importar en qué sección esté hoy.
  const orderNumbers = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return new Map(sorted.map((o, i) => [o.id, i + 1]));
  }, [orders]);

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const finished = orders.filter((o) => FINISHED_STATUSES.includes(o.status));
  const rejected = orders.filter((o) => o.status === "rejected");

  if (view === "chooser") {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 py-4 sm:py-10">
        <ChooserButton icon={Clock} label="Pedidos activos" count={active.length} onClick={() => changeView("active")} />
        <ChooserButton
          icon={CheckCircle2}
          label="Pedidos finalizados"
          count={finished.length}
          onClick={() => changeView("finished")}
        />
        {isAdmin && (
          <ChooserButton
            icon={XCircle}
            label="Pedidos rechazados"
            count={rejected.length}
            onClick={() => changeView("rejected")}
          />
        )}
        {bookingMode !== "off" && (
          <Link
            href="/admin/reservas"
            className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 hover:bg-white/[0.04] sm:w-48 sm:h-48 sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:rounded-3xl sm:p-0 sm:text-center sm:hover:scale-105 sm:hover:bg-transparent"
            style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nexora-muted)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent">
              <CalendarDays size={20} strokeWidth={1.5} className="sm:hidden" style={{ color: "var(--nexora-nova)" }} />
              <CalendarDays size={32} strokeWidth={1.5} className="hidden sm:block" style={{ color: "var(--nexora-nova)" }} />
            </span>
            <span className="min-w-0 flex-1 sm:flex-none">
              <span className="block text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
                Reservas
              </span>
              <span className="block text-xs mt-0.5 sm:hidden" style={{ color: "var(--nexora-ink-dim)" }}>
                Ver la agenda
              </span>
            </span>
            <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 sm:hidden" style={{ color: "var(--nexora-ink-dim)" }} />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Oculto mientras se ve el detalle de un pedido — ese detalle ya
          trae su propio "Volver" (a esta grilla), y mostrar los dos a la
          vez era confuso. */}
      {!viewingDetail && (
        <button
          onClick={() => changeView("chooser")}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
          style={{ color: 'var(--nexora-ink-dim)' }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>
      )}

      {view === "active" && (
        <OrdersTable
          orders={active}
          orderNumbers={orderNumbers}
          countryIso2={countryIso2}
          industryType={industryType}
          title="Pedidos activos"
          emptyMessage="No hay pedidos activos ahora mismo."
          onDetailChange={setViewingDetail}
        />
      )}
      {view === "finished" && (
        <OrdersTable
          orders={finished}
          orderNumbers={orderNumbers}
          countryIso2={countryIso2}
          industryType={industryType}
          title="Pedidos finalizados"
          emptyMessage="Todavía no hay pedidos finalizados."
          onDetailChange={setViewingDetail}
        />
      )}
      {view === "rejected" && isAdmin && (
        <OrdersTable
          orders={rejected}
          orderNumbers={orderNumbers}
          countryIso2={countryIso2}
          industryType={industryType}
          title="Pedidos rechazados"
          emptyMessage="No hay pedidos rechazados."
          onDetailChange={setViewingDetail}
        />
      )}
    </div>
  );
}

function ChooserButton({
  icon: Icon,
  label,
  count,
  onClick,
}: {
  icon: typeof Clock;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      // Móvil: fila compacta de ancho completo (icono en placa + texto +
      // cifra + chevron), mismo lenguaje visual que SectionMenuItem en
      // Clientes. Pedido explícito: "un card ocupa casi todo [el alto] y
      // hay otras 2 cards ahí pa abajo" — el cuadrado de 192x192 (que en
      // desktop sobra espacio de sobra) apilado 3 veces en columna era lo
      // que desbordaba el viewport de un teléfono. Desktop (sm:+): el
      // mismo cuadrado grande centrado de siempre, sin ningún cambio.
      className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 hover:bg-white/[0.04] sm:w-48 sm:h-48 sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:rounded-3xl sm:p-0 sm:text-center sm:hover:scale-105 sm:hover:bg-transparent"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nexora-muted)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent">
        <Icon size={20} strokeWidth={1.5} className="sm:hidden" style={{ color: 'var(--nexora-nova)' }} />
        <Icon size={32} strokeWidth={1.5} className="hidden sm:block" style={{ color: 'var(--nexora-nova)' }} />
      </span>

      <span className="min-w-0 flex-1 sm:flex-none">
        <span className="block text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
          {label}
        </span>
        {/* Cifra en móvil: subtítulo chico bajo la etiqueta, en la misma
            fila. En desktop no se usa — ahí la cifra grande de abajo
            (hermana directa de este bloque, mismo gap-3 de siempre). */}
        <span className="block text-xs mt-0.5 sm:hidden" style={{ color: 'var(--nexora-ink-dim)' }}>
          {count} pedido{count === 1 ? "" : "s"}
        </span>
      </span>

      <span className="hidden text-2xl font-light sm:block" style={{ color: 'var(--nexora-ink-dim)' }}>
        {count}
      </span>

      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 sm:hidden" style={{ color: 'var(--nexora-ink-dim)' }} />
    </button>
  );
}
