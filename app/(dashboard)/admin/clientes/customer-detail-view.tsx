"use client";

// Vista de detalle de un cliente dentro de Clientes (CRM ligero):
// datos del cliente + historial de pedidos + historial de conversaciones.
// Tocar una conversación reemplaza esta vista por su transcripción de
// chat con su propio botón Volver (mismo mecanismo "tocar y entrar" que
// clientes-panel.tsx usa para entrar acá) — así nunca hay dos botones
// Volver visibles a la vez.
import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// El historial de pedidos reutiliza el mismo indicador de estado que
// pedidos-panel.tsx (mismo look, sin duplicar el mapa de colores) — es
// una vista de solo lectura acá, no se puede cambiar el estado desde
// Clientes.
import { StatusDot } from "@/app/(dashboard)/admin/pedidos/orders-table";
import type { CustomerDetail } from "@/lib/services/customerService";
import type { Order } from "@/lib/types/order";
import type { Conversation } from "@/lib/services/conversationService";
import { channelLabel } from "./channel-labels";
import { formatShortDate, formatShortDateTime, formatTimeOnly } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";

function itemsSummary(order: Order): string {
  if (order.items.length === 0) return "—";
  return order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ");
}

export function CustomerDetailView({
  detail,
  countryIso2,
  onBack,
}: {
  detail: CustomerDetail;
  countryIso2: string | null;
  onBack: () => void;
}) {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const { customer, orders, conversations } = detail;
  if (!customer) return null;

  if (activeConversation) {
    return (
      <ConversationChatView
        conversation={activeConversation}
        onBack={() => setActiveConversation(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
        style={{ color: 'var(--nexora-ink-dim)' }}
      >
        <ChevronLeft size={16} />
        Volver
      </button>

      <div className="text-center space-y-1">
        <h2 className="font-nexora text-2xl font-semibold" style={{ color: 'var(--nexora-ink)' }}>
          {customer.name ?? "Sin nombre"}
        </h2>
        <p className="text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
          {customer.phone} · {channelLabel(customer.channel)}
        </p>
        <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          Cliente desde {formatShortDate(customer.created_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <section className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center gap-2 text-center">
            <Package size={20} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
            <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
              Historial de pedidos
            </h3>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
              Sin pedidos todavía.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>
                      {formatShortDate(order.created_at)}
                    </TableCell>
                    <TableCell
                      className="max-w-[220px] whitespace-normal"
                      style={{ color: 'var(--nexora-ink)' }}
                    >
                      {itemsSummary(order)}
                    </TableCell>
                    <TableCell style={{ color: 'var(--nexora-ink)' }}>
                      {formatCurrency(order.total, countryIso2)}
                    </TableCell>
                    <TableCell>
                      <StatusDot status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center gap-2 text-center">
            <MessageCircle size={20} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
            <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
              Conversaciones
            </h3>
          </div>

          {conversations.length === 0 ? (
            <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
              Sin conversaciones todavía.
            </p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setActiveConversation(conversation)}
                  className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <MessageCircle size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-nova)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
                      {channelLabel(conversation.channel)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                      {conversation.messages.length} mensaje{conversation.messages.length === 1 ? "" : "s"} ·
                      {" "}
                      última actividad {formatShortDateTime(conversation.updated_at)}
                    </p>
                  </div>
                  <ChevronRight size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-ink-dim)' }} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ConversationChatView({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const messages = [...conversation.messages].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
        style={{ color: 'var(--nexora-ink-dim)' }}
      >
        <ChevronLeft size={16} />
        Volver
      </button>

      <div className="text-center space-y-1">
        <h3 className="font-nexora text-lg font-semibold" style={{ color: 'var(--nexora-ink)' }}>
          {channelLabel(conversation.channel)}
        </h3>
        <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          Iniciada el {formatShortDate(conversation.created_at)}
        </p>
      </div>

      <div
        className="max-w-lg mx-auto rounded-2xl border p-4 space-y-3 max-h-[480px] overflow-y-auto"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      >
        {messages.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--nexora-ink-dim)' }}>
            Esta conversación todavía no tiene mensajes.
          </p>
        ) : (
          messages.map((message, i) => (
            <div
              key={i}
              className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className="max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap"
                style={{
                  background: message.role === "user" ? 'var(--nexora-nova)' : 'rgba(255,255,255,0.06)',
                  color: message.role === "user" ? 'var(--nexora-nova-ink)' : 'var(--nexora-ink)',
                }}
              >
                {message.content}
              </div>
              <span className="mt-1 text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
                {formatTimeOnly(message.at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
