"use client";

// Vista de detalle de un cliente dentro de Clientes (CRM ligero): header
// del cliente + menú de secciones (Pedidos, Conversaciones). Tocar una
// sección la abre a pantalla completa con su propio botón Volver (mismo
// mecanismo "tocar y entrar" que clientes-panel.tsx usa para entrar acá);
// dentro de Conversaciones, tocar una en particular abre un nivel más —
// su transcripción de chat, con su propio Volver. Nunca hay dos botones
// Volver visibles a la vez, cada uno solo retrocede un nivel: chat →
// lista de conversaciones → menú → lista de clientes.
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
import { IPhoneFrame } from "@/components/shared/IPhoneFrame";
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

// Cada sección del cliente (Pedidos, Conversaciones) vive detrás de su
// propia "puerta" en el menú — mismo patrón "tocar y entrar" que ya usa
// clientes-panel.tsx (lista → detalle) y que ya usaba este archivo para
// Conversaciones → ConversationChatView.
type SectionKey = "pedidos" | "conversaciones";

export function CustomerDetailView({
  detail,
  countryIso2,
  onBack,
}: {
  detail: CustomerDetail;
  countryIso2: string | null;
  onBack: () => void;
}) {
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const { customer, orders, conversations } = detail;
  if (!customer) return null;

  // Nivel más profundo: dentro de Conversaciones, tocar una en particular
  // reemplaza la vista por su transcripción. Volver acá regresa a la lista
  // de conversaciones (activeSection sigue en "conversaciones"), no al menú.
  if (activeConversation) {
    return (
      <ConversationChatView
        conversation={activeConversation}
        contactName={customer.name ?? "Cliente"}
        onBack={() => setActiveConversation(null)}
      />
    );
  }

  // Nivel intermedio: una sección abierta desde el menú. El contenido de
  // cada una es exactamente el mismo componente/JSX que ya existía — lo
  // único nuevo acá es el botón Volver, que regresa al menú del cliente.
  if (activeSection) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveSection(null)}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
          style={{ color: 'var(--nexora-ink-dim)' }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>

        {activeSection === "pedidos" && <OrdersSection orders={orders} countryIso2={countryIso2} />}
        {activeSection === "conversaciones" && (
          <ConversationsSection conversations={conversations} onOpen={setActiveConversation} />
        )}
      </div>
    );
  }

  // Nivel superior: header del cliente + menú de secciones.
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

      {/* Menú de secciones: Pedidos y Conversaciones, lado a lado. */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SectionMenuItem
          icon={Package}
          label="Pedidos"
          description="Historial de compras de este cliente."
          summary={orders.length === 0 ? "Sin pedidos" : `${orders.length} pedido${orders.length === 1 ? "" : "s"}`}
          onClick={() => setActiveSection("pedidos")}
        />
        <SectionMenuItem
          icon={MessageCircle}
          label="Conversaciones"
          description="Todo lo que habló con el agente de IA."
          summary={
            conversations.length === 0
              ? "Sin conversaciones"
              : `${conversations.length} conversación${conversations.length === 1 ? "" : "es"}`
          }
          onClick={() => setActiveSection("conversaciones")}
        />
      </div>
    </div>
  );
}

// Fila tocable del menú de secciones — mismo look que ya usaban las filas
// de conversación acá abajo y las tarjetas de cliente en clientes-panel.tsx
// (icono + texto + chevron, borde sutil, hover con fondo claro), extendido
// con un ícono en placa cuadrada para que se lea como entrada de menú y no
// como un ítem de lista plana.
function SectionMenuItem({
  icon: Icon,
  label,
  description,
  summary,
  onClick,
  className = "",
}: {
  icon: typeof Package;
  label: string;
  // Qué es esta sección y qué tipo de contenido va ahí — para que se
  // entienda de un vistazo sin tener que entrar primero a descubrirlo.
  description: string;
  summary: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-4 lg:gap-5 rounded-2xl border px-5 py-4 lg:px-7 lg:py-6 text-left transition-colors hover:bg-white/[0.06] ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <span
        className="mt-0.5 flex h-11 w-11 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'var(--nexora-muted)' }}
      >
        <Icon size={19} strokeWidth={1.5} className="lg:hidden" style={{ color: 'var(--nexora-nova)' }} />
        <Icon size={24} strokeWidth={1.5} className="hidden lg:block" style={{ color: 'var(--nexora-nova)' }} />
      </span>
      <div className="min-w-0 flex-1 space-y-1 lg:space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm lg:text-base font-medium" style={{ color: 'var(--nexora-ink)' }}>
            {label}
          </p>
          <span className="shrink-0 text-[11px] lg:text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            {summary}
          </span>
        </div>
        <p className="text-xs lg:text-sm leading-relaxed" style={{ color: 'var(--nexora-ink-dim)', opacity: 0.85 }}>
          {description}
        </p>
      </div>
      <ChevronRight size={16} strokeWidth={1.75} className="mt-1 shrink-0 lg:hidden" style={{ color: 'var(--nexora-ink-dim)' }} />
      <ChevronRight size={20} strokeWidth={1.75} className="mt-1.5 shrink-0 hidden lg:block" style={{ color: 'var(--nexora-ink-dim)' }} />
    </button>
  );
}

// Contenido de "Pedidos" — idéntico al que vivía inline en el return
// principal, solo movido a su propio componente para poder mostrarse como
// pantalla propia detrás del menú (misma tabla, mismos datos, cero cambio
// de lógica).
function OrdersSection({ orders, countryIso2 }: { orders: Order[]; countryIso2: string | null }) {
  return (
    <section className="space-y-4">
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
  );
}

// Contenido de "Conversaciones" — idéntico al que vivía inline en el
// return principal, solo movido a su propio componente. Tocar una fila
// sigue delegando en `onOpen` (activeConversation en el padre), que
// reemplaza esta pantalla por ConversationChatView.
function ConversationsSection({
  conversations,
  onOpen,
}: {
  conversations: Conversation[];
  onOpen: (conversation: Conversation) => void;
}) {
  return (
    <section className="space-y-4">
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
              onClick={() => onOpen(conversation)}
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
  );
}

// La conversación real del cliente con el agente, dentro de un iPhone.
// El teléfono representa el lado del cliente: sus mensajes (role "user") van
// a la derecha en azul; los del agente (role "assistant") a la izquierda.
function ConversationChatView({
  conversation,
  contactName,
  onBack,
}: {
  conversation: Conversation;
  contactName: string;
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

      <IPhoneFrame maxWidth={400}>
        <div style={{ background: "#fafafa" }}>
          {/* Cabecera estilo iOS */}
          <div
            className="flex items-center gap-2 px-3 pb-2.5 pt-11"
            style={{ background: "#f4f4f5", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
          >
            <ChevronLeft size={22} strokeWidth={2.5} style={{ color: "#0a84ff" }} className="shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <span
                className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{ background: "#8e8e93" }}
              >
                {contactName.trim().charAt(0).toUpperCase() || "C"}
              </span>
              <span className="truncate text-[13px] font-semibold" style={{ color: "#111" }}>
                {contactName}
              </span>
            </div>
            <span className="w-[22px] shrink-0" />
          </div>

          {/* Mensajes */}
          <div className="flex max-h-[520px] min-h-[360px] flex-col gap-1.5 overflow-y-auto px-3 py-4">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-xs" style={{ color: "#8e8e93" }}>
                Esta conversación todavía no tiene mensajes.
              </p>
            ) : (
              messages.map((message, i) => {
                const outgoing = message.role === "user";
                return (
                  <div key={i} className={`flex flex-col ${outgoing ? "items-end" : "items-start"}`}>
                    <div
                      className="max-w-[78%] whitespace-pre-wrap rounded-[18px] px-3 py-2 text-[14px] leading-snug"
                      style={
                        outgoing
                          ? { background: "#0a84ff", color: "#fff" }
                          : { background: "#e9e9eb", color: "#111" }
                      }
                    >
                      {message.content}
                    </div>
                    <span className="mt-0.5 px-1 text-[10px]" style={{ color: "#8e8e93" }}>
                      {formatTimeOnly(message.at)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Barra de gestos */}
          <div className="flex justify-center pb-2 pt-1" style={{ background: "#fafafa" }}>
            <span className="h-1 w-32 rounded-full" style={{ background: "rgba(0,0,0,0.28)" }} />
          </div>
        </div>
      </IPhoneFrame>
    </div>
  );
}
