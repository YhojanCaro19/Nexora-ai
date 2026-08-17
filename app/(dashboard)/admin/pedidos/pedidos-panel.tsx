"use client";

import { useMemo, useState } from "react";
import { Clock, CheckCircle2, XCircle, ChevronLeft } from "lucide-react";
import { OrdersTable } from "./orders-table";
import type { Order } from "@/lib/types/order";

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
  isAdmin,
}: {
  orders: Order[];
  countryIso2: string | null;
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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-10">
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
      className="flex flex-col items-center justify-center gap-3 w-48 h-48 rounded-3xl border transition-all duration-300 hover:scale-105"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <Icon size={32} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
      <span className="text-sm font-medium text-center px-2" style={{ color: 'var(--nexora-ink)' }}>
        {label}
      </span>
      <span className="text-2xl font-light" style={{ color: 'var(--nexora-ink-dim)' }}>
        {count}
      </span>
    </button>
  );
}
