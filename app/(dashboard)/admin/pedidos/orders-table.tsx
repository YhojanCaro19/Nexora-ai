"use client";

import { Fragment, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateOrderStatusAction } from "./actions";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type Order, type OrderStatus } from "@/lib/types/order";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--nexora-nova)",
  confirmed: "var(--nexora-nova)",
  delivered: "var(--nexora-signal)",
  cancelled: "var(--nexora-alert)",
};

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    await updateOrderStatusAction(orderId, status);
    setUpdatingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos</CardTitle>
        <CardDescription>
          {orders.length === 0
            ? "Todavía no hay pedidos."
            : `${orders.length} pedido${orders.length === 1 ? "" : "s"}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <Fragment key={o.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                >
                  <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>
                    {dateFormatter.format(new Date(o.created_at))}
                  </TableCell>
                  <TableCell style={{ color: 'var(--nexora-ink)' }}>
                    {o.items.length} producto{o.items.length === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell className="font-medium" style={{ color: 'var(--nexora-ink)' }}>
                    {currency.format(o.total)}
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                      style={{ color: STATUS_COLOR[o.status] ?? 'var(--nexora-ink-dim)' }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: STATUS_COLOR[o.status] ?? 'var(--nexora-ink-dim)' }}
                      />
                      {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                    </span>
                  </TableCell>
                </TableRow>
                {expandedId === o.id && (
                  <TableRow key={`${o.id}-detail`}>
                    <TableCell colSpan={4}>
                      <div className="space-y-3 py-2">
                        <ul className="space-y-1">
                          {o.items.map((item, i) => (
                            <li key={i} className="flex justify-between text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
                              <span>{item.quantity}× {item.name}</span>
                              <span>{currency.format(item.quantity * item.unit_price)}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="flex flex-wrap gap-2">
                          {ORDER_STATUSES.map((status) => (
                            <button
                              key={status}
                              disabled={updatingId === o.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(o.id, status);
                              }}
                              className="rounded-full px-3 py-1 text-xs border transition-colors"
                              style={{
                                background: o.status === status ? 'var(--nexora-signal)' : 'transparent',
                                color: o.status === status ? '#000' : 'var(--nexora-ink-dim)',
                                borderColor: o.status === status ? 'var(--nexora-signal)' : 'rgba(255,255,255,0.15)',
                              }}
                            >
                              {ORDER_STATUS_LABELS[status]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  No hay pedidos todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
