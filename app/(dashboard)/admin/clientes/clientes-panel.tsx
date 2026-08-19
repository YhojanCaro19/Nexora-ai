"use client";

// Patrón "tocar y entrar" — mismo mecanismo que catalogo-panel.tsx y
// mi-agente-panel.tsx: tocar un cliente reemplaza la lista por su vista
// de detalle con un botón Volver, nunca un acordeón ni un modal. La lista
// llega server-side (page.tsx → getCustomersForBusiness); el detalle
// (pedidos + conversaciones) se pide bajo demanda al tocar un cliente,
// vía getCustomerDetailAction, porque es una consulta más pesada que no
// vale la pena precargar para todos los clientes de una.
import { useMemo, useState } from "react";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
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
import { getCustomerDetailAction } from "./actions";
import { channelLabel } from "./channel-labels";
import type { Customer, CustomerDetail } from "@/lib/services/customerService";
import { formatShortDate } from "@/lib/utils/date";

export function ClientesPanel({
  customers,
  countryIso2,
}: {
  customers: Customer[];
  countryIso2: string | null;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Canal</TableHead>
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
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{formatShortDate(c.created_at)}</TableCell>
                <TableCell>
                  <ChevronRight size={16} strokeWidth={1.75} style={{ color: 'var(--nexora-ink-dim)' }} />
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  No hay clientes todavía.
                </TableCell>
              </TableRow>
            )}
            {customers.length > 0 && filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
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
