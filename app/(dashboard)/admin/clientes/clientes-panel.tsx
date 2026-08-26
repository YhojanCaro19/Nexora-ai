"use client";

// Patrón "tocar y entrar" — mismo mecanismo que catalogo-panel.tsx y
// mi-agente-panel.tsx: tocar un cliente reemplaza la lista por su vista
// de detalle con un botón Volver, nunca un acordeón ni un modal. La lista
// llega server-side (page.tsx → getCustomersForBusiness); el detalle
// (pedidos + conversaciones) se pide bajo demanda al tocar un cliente,
// vía getCustomerDetailAction, porque es una consulta más pesada que no
// vale la pena precargar para todos los clientes de una.
import { useMemo, useState } from "react";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  StickyNote,
  ListChecks,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CustomerDetailView } from "./customer-detail-view";
import { TagChip } from "./tag-chip";
import { getCustomerDetailAction } from "./actions";
import { channelLabel } from "./channel-labels";
import type { Customer, CustomerDetail } from "@/lib/services/customerService";
import type { Tag } from "@/lib/services/tagService";
import { formatShortDate } from "@/lib/utils/date";

// Cuántas notas/tareas pendientes tiene el cliente — pedido explícito: que
// esa información "se refleje en el cliente como tal" en la lista, no solo
// dentro del detalle. Mismos íconos que ya usa CustomerDetailView para
// Notas (StickyNote) y Tareas (ListChecks), solo se muestra cada uno si
// hay algo que contar (0 no se dibuja, ya lo dice el "—" de al lado si
// tampoco hay etiquetas).
function CustomerActivityBadges({ noteCount, pendingTaskCount }: { noteCount: number; pendingTaskCount: number }) {
  if (noteCount === 0 && pendingTaskCount === 0) {
    return <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>—</span>;
  }
  return (
    <div className="flex items-center gap-2.5">
      {noteCount > 0 && (
        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
          <StickyNote size={13} strokeWidth={1.75} />
          {noteCount}
        </span>
      )}
      {pendingTaskCount > 0 && (
        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--nexora-nova)' }}>
          <ListChecks size={13} strokeWidth={1.75} />
          {pendingTaskCount}
        </span>
      )}
    </div>
  );
}

// Pedido explícito: en la lista, las etiquetas ya no se muestran "regadas"
// como chips sueltos — quedan detrás de un acordeón cerrado por defecto
// (solo un resumen "N etiquetas") que se despliega al tocarlo y se vuelve
// a cerrar al tocarlo de nuevo. stopPropagation en el wrapper es necesario
// porque esta celda vive dentro de una fila/tarjeta que ya tiene su propio
// onClick para abrir el detalle del cliente (openCustomer) — sin esto,
// tocar el acordeón navegaría al detalle en vez de solo desplegarlo.
function CustomerTagsAccordion({ tags }: { tags: Tag[] }) {
  const [open, setOpen] = useState(false);

  if (tags.length === 0) {
    return <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>—</span>;
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="mx-auto flex max-w-[220px] flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-white/[0.06]"
        style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'var(--nexora-ink-dim)' }}
      >
        <TagIcon size={12} strokeWidth={1.75} />
        {tags.length} etiqueta{tags.length === 1 ? "" : "s"}
        <ChevronDown
          size={12}
          strokeWidth={2}
          className="transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col items-center gap-1">
          {tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientesPanel({
  customers,
  countryIso2,
  tagsByCustomer,
  noteCountsByCustomer,
  pendingTaskCountsByCustomer,
}: {
  customers: Customer[];
  countryIso2: string | null;
  // Los 3 llegan como pares [customerId, valor] desde page.tsx (un Map no
  // serializa limpio de Server a Client Component) — se reconstruyen acá.
  tagsByCustomer: Array<[string, Tag[]]>;
  noteCountsByCustomer: Array<[string, number]>;
  pendingTaskCountsByCustomer: Array<[string, number]>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tagsMap = useMemo(() => new Map(tagsByCustomer), [tagsByCustomer]);
  const noteCountsMap = useMemo(() => new Map(noteCountsByCustomer), [noteCountsByCustomer]);
  const pendingTaskCountsMap = useMemo(() => new Map(pendingTaskCountsByCustomer), [pendingTaskCountsByCustomer]);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => (c.name ?? "sin nombre").toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [customers, query]);

  async function openCustomer(customer: Customer) {
    setSelected(customer);
    setDetail(null);
    setError(null);
    setLoading(true);
    const result = await getCustomerDetailAction(customer.id);
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error ?? "No se pudo cargar el cliente");
      return;
    }
    setDetail(result.data);
  }

  function closeCustomer() {
    setSelected(null);
    setDetail(null);
    setError(null);
  }

  if (selected) {
    // El botón Volver vive DENTRO de CustomerDetailView, no acá — así
    // solo hay uno a la vez: vuelve a la lista cuando se ve el detalle
    // del cliente, o a ese detalle cuando se ve el chat de una
    // conversación (antes había uno acá y otro adentro al mismo tiempo).
    if (loading) {
      return (
        <p className="text-sm text-center py-10" style={{ color: 'var(--nexora-ink-dim)' }}>
          Cargando cliente...
        </p>
      );
    }
    if (error) {
      return (
        <div className="space-y-4">
          <button
            onClick={closeCustomer}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--nexora-ink-dim)' }}
          >
            <ChevronLeft size={16} />
            Volver
          </button>
          <p className="text-sm text-center" style={{ color: 'var(--nexora-alert)' }}>
            {error}
          </p>
        </div>
      );
    }
    if (detail) {
      return <CustomerDetailView detail={detail} countryIso2={countryIso2} onBack={closeCustomer} />;
    }
    return null;
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Clientes</CardTitle>
        <CardDescription>
          {customers.length === 0
            ? "Todavía no hay clientes registrados."
            : `${customers.length} cliente${customers.length === 1 ? "" : "s"} registrados.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ícono e input como hermanos en flex con gap — ver misma nota
            en catalogo/products-table.tsx. */}
        {customers.length > 0 && (
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
              placeholder="Buscar por nombre o teléfono..."
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              style={{ color: 'var(--nexora-ink)' }}
            />
          </div>
        )}
        {/* Una sola tabla para todos los tamaños — pedido explícito:
            "que se vea igual que en desktop, que salga horizontal el
            cliente, que se pueda ir corriendo". Antes había una versión
            aparte para móvil con cada cliente como su propia <Card>
            apilada DENTRO del CardContent de esta Card — pedido explícito
            también: "no me gusta que hayan cards dentro de cards". El
            componente Table (components/ui/table.tsx) ya envuelve en un
            div con overflow-x-auto, así que en una pantalla angosta la
            fila completa se puede correr con el dedo en vez de
            reacomodarse — igual que cualquier tabla ancha de la web. */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-center">Etiquetas</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead>Registrado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((c) => (
              <TableRow key={c.id} onClick={() => openCustomer(c)} className="cursor-pointer">
                <TableCell className="font-medium" style={{ color: 'var(--nexora-ink)' }}>
                  {c.name ?? "Sin nombre"}
                </TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{c.phone}</TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{channelLabel(c.channel)}</TableCell>
                <TableCell>
                  <CustomerTagsAccordion tags={tagsMap.get(c.id) ?? []} />
                </TableCell>
                <TableCell>
                  <CustomerActivityBadges
                    noteCount={noteCountsMap.get(c.id) ?? 0}
                    pendingTaskCount={pendingTaskCountsMap.get(c.id) ?? 0}
                  />
                </TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{formatShortDate(c.created_at)}</TableCell>
                <TableCell>
                  <ChevronRight size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-ink-dim)' }} />
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  No hay clientes todavía.
                </TableCell>
              </TableRow>
            )}
            {customers.length > 0 && filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  Ningún cliente coincide con &quot;{query}&quot;.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
