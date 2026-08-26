"use client";

// Vista de detalle de un cliente dentro de Clientes (CRM ligero): header
// del cliente + menú de secciones (Pedidos, Conversaciones, Notas, Tareas,
// Etiquetas). Tocar una sección la abre a pantalla completa con su propio
// botón Volver (mismo mecanismo "tocar y entrar" que clientes-panel.tsx
// usa para entrar acá); dentro de Conversaciones, tocar una en particular
// abre un nivel más — su transcripción de chat, con su propio Volver.
// Nunca hay dos botones Volver visibles a la vez, cada uno solo retrocede
// un nivel: chat → lista de conversaciones → menú → lista de clientes.
import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ListChecks,
  MessageCircle,
  Package,
  StickyNote,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// El historial de pedidos reutiliza el mismo indicador de estado que
// pedidos-panel.tsx (mismo look, sin duplicar el mapa de colores) — es
// una vista de solo lectura acá, no se puede cambiar el estado desde
// Clientes.
import { StatusDot } from "@/app/(dashboard)/admin/pedidos/orders-table";
import { TagChip } from "./tag-chip";
import {
  createCustomerNoteAction,
  createCustomerTaskAction,
  createTagAction,
  deleteCustomerNoteAction,
  getTagsForBusinessAction,
  assignTagToCustomerAction,
  removeTagFromCustomerAction,
  toggleCustomerTaskDoneAction,
} from "./actions";
import type { CustomerDetail } from "@/lib/services/customerService";
import type { Order } from "@/lib/types/order";
import type { Conversation } from "@/lib/services/conversationService";
import type { CustomerNote } from "@/lib/services/customerNoteService";
import type { Tag } from "@/lib/services/tagService";
import type { CustomerTask } from "@/lib/services/customerTaskService";
// Los 3 topes vienen de acá, no de los services de arriba: esos importan
// createClient() de lib/supabase/server.ts (solo servidor, usa
// "next/headers"), y este archivo es "use client" — importar un value
// (no un type) de un service server-only rompe el build. Ver el porqué
// completo en lib/constants/customerLimits.ts.
import {
  MAX_TAGS_PER_CUSTOMER,
  MAX_NOTES_PER_CUSTOMER,
  MAX_PENDING_TASKS_PER_CUSTOMER,
} from "@/lib/constants/customerLimits";
import { channelLabel } from "./channel-labels";
import { formatDateOnly, formatShortDate, formatShortDateTime, formatTimeOnly } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";

function itemsSummary(order: Order): string {
  if (order.items.length === 0) return "—";
  return order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ");
}

// Cada sección del cliente (Pedidos, Conversaciones, Notas, Tareas,
// Etiquetas) vive detrás de su propia "puerta" en el menú — mismo patrón
// "tocar y entrar" que ya usa clientes-panel.tsx (lista → detalle) y que
// ya usaba este archivo para Conversaciones → ConversationChatView, ahora
// aplicado a un nivel más arriba, a las 5 secciones del cliente.
type SectionKey = "pedidos" | "conversaciones" | "notas" | "tareas" | "etiquetas";

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
  // Notas, etiquetas y tareas se manejan en estado local a partir de acá:
  // al crear/asignar/completar algo se actualiza este array directo, sin
  // pedir de nuevo todo el detalle del cliente (mismo espíritu ágil que el
  // resto del panel — ver openCustomer en clientes-panel.tsx). Como este
  // componente se desmonta al volver a la lista (clientes-panel.tsx solo
  // lo renderiza cuando ya hay `detail` cargado), este useState solo se
  // inicializa una vez por cliente abierto, nunca se pisa con datos de otro.
  const [notes, setNotes] = useState<CustomerNote[]>(detail.notes);
  const [tags, setTags] = useState<Tag[]>(detail.tags);
  const [tasks, setTasks] = useState<CustomerTask[]>(detail.tasks);

  const { customer, orders, conversations } = detail;
  if (!customer) return null;

  // Nivel más profundo: dentro de Conversaciones, tocar una en particular
  // reemplaza la vista por su transcripción. Volver acá regresa a la lista
  // de conversaciones (activeSection sigue en "conversaciones"), no al menú.
  if (activeConversation) {
    return (
      <ConversationChatView
        conversation={activeConversation}
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
        {activeSection === "notas" && (
          <NotesSection
            customerId={customer.id}
            notes={notes}
            onAdd={(note) => setNotes((prev) => [note, ...prev])}
            onDelete={(noteId) => setNotes((prev) => prev.filter((n) => n.id !== noteId))}
          />
        )}
        {activeSection === "tareas" && (
          <TasksSection customerId={customer.id} tasks={tasks} onTasksChange={setTasks} />
        )}
        {activeSection === "etiquetas" && (
          <TagsSection customerId={customer.id} tags={tags} onTagsChange={setTags} />
        )}
      </div>
    );
  }

  // Nivel superior: header del cliente + menú de secciones.
  const pendingTasks = tasks.filter((t) => t.done_at === null).length;

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

      {/* Menú de secciones: 2x2 con los cuatro bloques de actividad
          (mismo peso visual entre sí) + Etiquetas como fila completa
          debajo — es un tipo de contenido distinto (gestión de tags, no
          historial/actividad), separarla visualmente evita que compita
          por espacio con las otras cuatro y la deja igual de accesible.
          Recorrido: max-w-2xl/gap-3 (original) → max-w-4xl/gap-5 (1er
          ajuste, "usa más el espacio") → max-w-6xl/gap-6 (este, "sigue
          mal, muy junto") — en pantallas grandes de verdad (>1280px) el
          4xl seguía dejando mucho margen sin usar a los lados. 6xl ya
          rompe la simetría con el grid de Pedidos/Conversaciones más
          abajo (que se queda en 4xl porque ES una tabla/lista, no
          tarjetas — un ancho excesivo ahí solo estira columnas vacías),
          así que ahora son anchos distintos a propósito, no por
          descuido. */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
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
        <SectionMenuItem
          icon={StickyNote}
          label="Notas"
          description="Apuntes internos del equipo — lo que el agente no capta."
          summary={notes.length === 0 ? "Sin notas" : `${notes.length} nota${notes.length === 1 ? "" : "s"}`}
          onClick={() => setActiveSection("notas")}
        />
        <SectionMenuItem
          icon={ListChecks}
          label="Tareas"
          description="Recordatorios de seguimiento manual, ej. llamar mañana."
          summary={tasks.length === 0 ? "Sin tareas" : `${pendingTasks} pendiente${pendingTasks === 1 ? "" : "s"}`}
          onClick={() => setActiveSection("tareas")}
        />
        <SectionMenuItem
          icon={TagIcon}
          label="Etiquetas"
          description="Clasifica al cliente para encontrarlo rápido — ej. cliente frecuente, atrasado en pagos, prospecto."
          summary={tags.length === 0 ? "Sin etiquetas" : `${tags.length} etiqueta${tags.length === 1 ? "" : "s"}`}
          onClick={() => setActiveSection("etiquetas")}
          className="sm:col-span-2"
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

// Etiquetas asignadas al cliente + un solo campo para agregar una — pedido
// explícito tras feedback real: el selector "elegir etiqueta" de antes
// mostraba el ID crudo en vez del nombre (bug real de cómo SelectValue
// renderiza acá) y la organización en dos flujos separados (elegir /
// crear, este último escondido detrás de un link) "no gustaba". Ahora es
// un único input: si el nombre escrito coincide (sin importar mayúsculas)
// con una etiqueta que YA existe en el negocio, la reutiliza y la asigna
// directo — no la duplica ni tira error de "ya existe" — y si no existe,
// la crea. El catálogo del negocio (availableTags) se pide una sola vez al
// montar, solo para esa comparación, nunca se muestra como lista propia.
function TagsSection({
  customerId,
  tags,
  onTagsChange,
}: {
  customerId: string;
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTagsForBusinessAction().then((result) => {
      if (cancelled) return;
      setAvailableTags(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRemove(tagId: string) {
    setRemovingId(tagId);
    setError(null);
    const result = await removeTagFromCustomerAction(customerId, tagId);
    setRemovingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    onTagsChange(tags.filter((t) => t.id !== tagId));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("El cliente ya tiene esa etiqueta");
      return;
    }

    if (tags.length >= MAX_TAGS_PER_CUSTOMER) {
      setError(`Máximo ${MAX_TAGS_PER_CUSTOMER} etiquetas por cliente. Quita una para agregar otra.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    // ¿Ya existe en el negocio (de otro cliente)? La reutiliza en vez de
    // duplicarla o de que createTagAction tire "ya existe una etiqueta
    // con ese nombre" — el usuario solo quiere escribir un nombre y que
    // funcione, sin pensar si ya existía.
    const existing = availableTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    let tag = existing ?? null;

    if (!tag) {
      const created = await createTagAction(trimmed);
      if (created.error || !created.data) {
        setSubmitting(false);
        setError(created.error ?? "No se pudo crear la etiqueta");
        return;
      }
      tag = created.data;
      setAvailableTags((prev) => [...prev, tag as Tag]);
    }

    const assignResult = await assignTagToCustomerAction(customerId, tag.id);
    setSubmitting(false);
    if (assignResult.error) {
      setError(assignResult.error);
      return;
    }
    onTagsChange([...tags, tag]);
    setNewTagName("");
  }

  return (
    <section className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex flex-col items-center gap-2 text-center">
        <TagIcon size={20} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
        <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
          Etiquetas
        </h3>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          Sin etiquetas todavía.
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              onRemove={() => handleRemove(tag.id)}
              removing={removingId === tag.id}
            />
          ))}
        </div>
      )}

      {tags.length >= MAX_TAGS_PER_CUSTOMER ? (
        <p className="text-xs text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          Máximo {MAX_TAGS_PER_CUSTOMER} etiquetas por cliente. Quita una para agregar otra.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center justify-center gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Escribe una etiqueta y presiona agregar..."
            className="max-w-[260px]"
          />
          <Button type="submit" size="sm" disabled={submitting || !newTagName.trim()}>
            {submitting ? "Agregando..." : "Agregar"}
          </Button>
        </form>
      )}

      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--nexora-alert)' }}>
          {error}
        </p>
      )}
    </section>
  );
}

// Notas internas del equipo sobre el cliente — más reciente primero (ya
// llegan así de getNotesForCustomer, y la nota nueva se agrega al frente
// del array local para mantener ese mismo orden sin refrescar todo). A
// partir del tope de MAX_NOTES_PER_CUSTOMER cada nota tiene su botón de
// borrar (antes no existía, ver nota en customerNoteService.ts) — es la
// única forma de hacer espacio para una nueva una vez alcanzado el tope.
function NotesSection({
  customerId,
  notes,
  onAdd,
  onDelete,
}: {
  customerId: string;
  notes: CustomerNote[];
  onAdd: (note: CustomerNote) => void;
  onDelete: (noteId: string) => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const atLimit = notes.length >= MAX_NOTES_PER_CUSTOMER;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || atLimit) return;
    setSaving(true);
    setError(null);
    const result = await createCustomerNoteAction(customerId, text);
    setSaving(false);
    if (result.error || !result.data) {
      setError(result.error ?? "No se pudo guardar la nota");
      return;
    }
    onAdd(result.data);
    setText("");
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId);
    setError(null);
    const result = await deleteCustomerNoteAction(noteId);
    setDeletingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDelete(noteId);
  }

  return (
    <section className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex flex-col items-center gap-2 text-center">
        <StickyNote size={20} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
        <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
          Notas internas
        </h3>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          Todavía no hay notas sobre este cliente.
        </p>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--nexora-ink)' }}>
                  {note.text}
                </p>
                <p className="mt-1.5 text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
                  {note.author_name ?? "Alguien del equipo"} · {formatShortDateTime(note.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                disabled={deletingId === note.id}
                aria-label="Borrar nota"
                className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                style={{ color: 'var(--nexora-ink-dim)' }}
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}

      {atLimit ? (
        <p className="text-xs text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          Máximo {MAX_NOTES_PER_CUSTOMER} notas por cliente. Borra una para agregar otra.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2 text-center">
          <Label htmlFor="new-note" className="justify-center">
            Agregar una nota
          </Label>
          <Textarea
            id="new-note"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un apunte interno sobre este cliente..."
          />
          <Button type="submit" size="sm" disabled={saving || !text.trim()}>
            {saving ? "Guardando..." : "Guardar nota"}
          </Button>
        </form>
      )}

      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--nexora-alert)' }}>
          {error}
        </p>
      )}
    </section>
  );
}

// Tareas/recordatorios sobre el cliente. La lista que llega en `tasks` ya
// viene pendientes-primero-por-fecha y hechas-al-final (getTasksForCustomer);
// al crear una tarea nueva se inserta antes del primer "hecho" local para
// no romper ese orden sin volver a pedir todo el detalle.
function TasksSection({
  customerId,
  tasks,
  onTasksChange,
}: {
  customerId: string;
  tasks: CustomerTask[];
  onTasksChange: (tasks: CustomerTask[]) => void;
}) {
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Separadas en dos apartados — "Pendientes" arriba, "Completadas" abajo —
  // en vez de una sola lista mezclada con tachado, pedido explícito: "las
  // tareas completadas se deben poner en otro apartado". Se calculan acá
  // arriba (no solo antes del render) porque handleSubmit también necesita
  // pendingTasks.length para el tope de pendientes.
  const pendingTasks = tasks.filter((t) => t.done_at === null);
  const doneTasks = tasks.filter((t) => t.done_at !== null);
  const atPendingLimit = pendingTasks.length >= MAX_PENDING_TASKS_PER_CUSTOMER;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || atPendingLimit) return;
    setSaving(true);
    setError(null);
    const result = await createCustomerTaskAction(customerId, text, dueDate || null);
    setSaving(false);
    if (result.error || !result.data) {
      setError(result.error ?? "No se pudo crear la tarea");
      return;
    }
    const newTask = result.data;
    const firstDoneIndex = tasks.findIndex((t) => t.done_at !== null);
    const insertAt = firstDoneIndex === -1 ? tasks.length : firstDoneIndex;
    onTasksChange([...tasks.slice(0, insertAt), newTask, ...tasks.slice(insertAt)]);
    setText("");
    setDueDate("");
  }

  // Pedido explícito: "no dejar destachar una tarea, porque si la marco es
  // que ya la completé" — una vez completada, la tarea queda fija en ese
  // estado (sin checkbox para revertir); ya no es un toggle bidireccional,
  // es una acción de una sola vía. Por eso el guard `task.done_at !== null`
  // acá, y por eso el <Checkbox> de una tarea completada más abajo se
  // renderiza `disabled` sin `onCheckedChange`.
  async function handleComplete(task: CustomerTask) {
    if (task.done_at !== null) return;
    setTogglingId(task.id);
    setError(null);
    const result = await toggleCustomerTaskDoneAction(task.id, true);
    setTogglingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    onTasksChange(
      tasks.map((t) => (t.id === task.id ? { ...t, done_at: new Date().toISOString() } : t))
    );
  }

  function renderTaskRow(task: CustomerTask) {
    const done = task.done_at !== null;
    return (
      <div
        key={task.id}
        className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <Checkbox
          checked={done}
          disabled={done || togglingId === task.id}
          onCheckedChange={() => handleComplete(task)}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm ${done ? "line-through" : ""}`}
            style={{ color: done ? 'var(--nexora-ink-dim)' : 'var(--nexora-ink)' }}
          >
            {task.text}
          </p>
          {/* Pedido explícito: "en las tareas hay que mostrar cuándo
              se creó la tarea y hasta cuándo se tiene para
              hacerla" + ajuste de texto: "se tiene hasta [fecha]
              para completarse" en vez de "Vence el [fecha]". */}
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
            Creada el {formatShortDate(task.created_at)}
            {task.due_date && (
              <> · Se tiene hasta {formatDateOnly(task.due_date)} para completarse</>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex flex-col items-center gap-2 text-center">
        <ListChecks size={20} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
        <h3 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
          Tareas
        </h3>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          Sin tareas pendientes.
        </p>
      ) : (
        <div className="space-y-4">
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
              No hay tareas pendientes.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {pendingTasks.map(renderTaskRow)}
            </div>
          )}

          {doneTasks.length > 0 && (
            <div className="space-y-2">
              <p
                className="text-xs uppercase tracking-wide font-semibold text-center"
                style={{ color: 'var(--nexora-ink-dim)' }}
              >
                Tareas completadas
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {doneTasks.map(renderTaskRow)}
              </div>
            </div>
          )}
        </div>
      )}

      {atPendingLimit ? (
        <p className="text-xs text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          Máximo {MAX_PENDING_TASKS_PER_CUSTOMER} tareas pendientes por cliente. Completa una para agregar otra.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2 text-center">
          <Label htmlFor="new-task" className="justify-center">
            Agregar una tarea
          </Label>
          <Input
            id="new-task"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué hay que hacer?"
          />
          <div className="flex flex-col items-center gap-1">
            <Label htmlFor="new-task-due" className="text-xs font-normal" style={{ color: 'var(--nexora-ink-dim)' }}>
              Fecha límite (opcional)
            </Label>
            {/* 🐛→✅ Bug real confirmado con datos: la fecha límite nunca
                llegaba a guardarse (verificado con una consulta directa a
                customer_tasks, due_date quedaba null aunque se elegía una
                fecha en el formulario). El componente <Input> del proyecto
                es un wrapper de Base UI (Field.Control) pensado para su
                propio contrato value/onValueChange — funciona bien para
                texto normal, pero un input de fecha nativo dispara sus
                eventos de cambio por segmento (día/mes/año) de forma
                distinta, y ahí se perdía el valor antes de llegar a
                `dueDate`. Un <input> nativo de HTML, sin ese wrapper, es
                100% predecible para fechas — mismas clases de Tailwind que
                ya usa <Input> para verse igual. */}
            <input
              id="new-task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 w-40 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>
              {error}
            </p>
          )}
          <Button type="submit" size="sm" disabled={saving || !text.trim()}>
            {saving ? "Guardando..." : "Crear tarea"}
          </Button>
        </form>
      )}
    </section>
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
