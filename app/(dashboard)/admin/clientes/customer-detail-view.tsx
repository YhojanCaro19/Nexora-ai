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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          por espacio con las otras cuatro y la deja igual de accesible. */}
      <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors hover:bg-white/[0.06] ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <span
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'var(--nexora-muted)' }}
      >
        <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
            {label}
          </p>
          <span className="shrink-0 text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
            {summary}
          </span>
        </div>
        <p className="text-xs leading-snug" style={{ color: 'var(--nexora-ink-dim)', opacity: 0.85 }}>
          {description}
        </p>
      </div>
      <ChevronRight size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" style={{ color: 'var(--nexora-ink-dim)' }} />
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

// Etiquetas asignadas al cliente + selector para asignar una existente o
// crear una nueva ahí mismo. El catálogo de etiquetas del negocio
// (availableTags) se pide una sola vez al montar — es una lista corta
// (etiquetas, no clientes), no vale la pena precargarla desde el server
// component solo para este selector.
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
  const [loadingTags, setLoadingTags] = useState(true);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTagsForBusinessAction().then((result) => {
      if (cancelled) return;
      setAvailableTags(result.data);
      setLoadingTags(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const assignedIds = new Set(tags.map((t) => t.id));
  const selectableTags = availableTags.filter((t) => !assignedIds.has(t.id));

  async function handleAssign() {
    if (!selectedTagId) return;
    setAssigning(true);
    setError(null);
    const result = await assignTagToCustomerAction(customerId, selectedTagId);
    setAssigning(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const tag = availableTags.find((t) => t.id === selectedTagId);
    if (tag) onTagsChange([...tags, tag]);
    setSelectedTagId("");
  }

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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setAssigning(true);
    setError(null);
    const created = await createTagAction(newTagName);
    if (created.error || !created.data) {
      setAssigning(false);
      setError(created.error ?? "No se pudo crear la etiqueta");
      return;
    }
    const newTag = created.data;
    const assignResult = await assignTagToCustomerAction(customerId, newTag.id);
    setAssigning(false);
    if (assignResult.error) {
      setError(assignResult.error);
      return;
    }
    setAvailableTags((prev) => [...prev, newTag]);
    onTagsChange([...tags, newTag]);
    setNewTagName("");
    setCreating(false);
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

      {!loadingTags && (
        <div className="space-y-3">
          {selectableTags.length > 0 && (
            <div className="flex items-center justify-center gap-2">
              <Select value={selectedTagId} onValueChange={(v) => setSelectedTagId(v ?? "")}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Elegir etiqueta" />
                </SelectTrigger>
                <SelectContent>
                  {selectableTags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" disabled={!selectedTagId || assigning} onClick={handleAssign}>
                Agregar
              </Button>
            </div>
          )}

          {!creating ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="text-xs underline underline-offset-2"
                style={{ color: 'var(--nexora-ink-dim)' }}
              >
                + Crear una etiqueta nueva
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col items-center gap-2">
              <Input
                autoFocus
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nombre de la etiqueta"
                className="max-w-[220px]"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={assigning || !newTagName.trim()}>
                  {assigning ? "Creando..." : "Crear y asignar"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCreating(false);
                    setNewTagName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
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
// del array local para mantener ese mismo orden sin refrescar todo).
function NotesSection({
  customerId,
  notes,
  onAdd,
}: {
  customerId: string;
  notes: CustomerNote[];
  onAdd: (note: CustomerNote) => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
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
              className="rounded-xl border px-3 py-2.5 text-left"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--nexora-ink)' }}>
                {note.text}
              </p>
              <p className="mt-1.5 text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
                {note.author_name ?? "Alguien del equipo"} · {formatShortDateTime(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

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
        {error && (
          <p className="text-xs" style={{ color: 'var(--nexora-alert)' }}>
            {error}
          </p>
        )}
        <Button type="submit" size="sm" disabled={saving || !text.trim()}>
          {saving ? "Guardando..." : "Guardar nota"}
        </Button>
      </form>
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
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

  async function handleToggle(task: CustomerTask) {
    setTogglingId(task.id);
    setError(null);
    const nextDone = task.done_at === null;
    const result = await toggleCustomerTaskDoneAction(task.id, nextDone);
    setTogglingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    onTasksChange(
      tasks.map((t) => (t.id === task.id ? { ...t, done_at: nextDone ? new Date().toISOString() : null } : t))
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
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {tasks.map((task) => {
            const done = task.done_at !== null;
            return (
              <div
                key={task.id}
                className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <Checkbox
                  checked={done}
                  disabled={togglingId === task.id}
                  onCheckedChange={() => handleToggle(task)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${done ? "line-through" : ""}`}
                    style={{ color: done ? 'var(--nexora-ink-dim)' : 'var(--nexora-ink)' }}
                  >
                    {task.text}
                  </p>
                  {task.due_date && (
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
                      Vence el {formatDateOnly(task.due_date)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          <Input
            id="new-task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-40"
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
