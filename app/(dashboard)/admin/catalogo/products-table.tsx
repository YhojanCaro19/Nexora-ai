"use client";

import { useMemo, useState } from "react";
import { Search, AlertTriangle, Download, ListFilter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toggleProductActiveAction } from "./actions";
import { ProductForm } from "./product-form";
import type { Product } from "@/lib/services/productService";
import { formatCurrency } from "@/lib/utils/currency";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/validators/productSchema";
import { toCsv, downloadCsv } from "@/lib/utils/csv";

export function ProductsTable({
  products,
  countryIso2,
  industryType,
}: {
  products: Product[];
  countryIso2: string | null;
  industryType: string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const editing = products.find((p) => p.id === editingId) ?? null;

  // Solo las categorías que de verdad tienen al menos un producto —
  // mostrar chips de categorías vacías sería ruido, no ayuda a filtrar.
  const usedCategories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))].sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.category?.toLowerCase().includes(q) ?? false);
    });
  }, [products, query, categoryFilter]);

  // Mismas columnas que espera el importador (BulkImport) — así el CSV
  // exportado se puede editar y volver a importar tal cual, sin tener que
  // adivinar el formato.
  function handleExportCsv() {
    const rows = filteredProducts.map((p) => ({
      nombre: p.name,
      descripcion: p.description ?? "",
      precio: p.price,
      stock: p.stock ?? "",
      categoria: p.category ?? "",
      umbral_stock_bajo: p.low_stock_threshold ?? "",
    }));
    const csv = toCsv(rows, [
      { key: "nombre", label: "nombre" },
      { key: "descripcion", label: "descripcion" },
      { key: "precio", label: "precio" },
      { key: "stock", label: "stock" },
      { key: "categoria", label: "categoria" },
      { key: "umbral_stock_bajo", label: "umbral_stock_bajo" },
    ]);
    downloadCsv("catalogo", csv);
  }

  async function handleToggle(product: Product) {
    setTogglingId(product.id);
    await toggleProductActiveAction(product.id, !product.active);
    setTogglingId(null);
  }

  if (editing) {
    return <ProductForm editingProduct={editing} onDone={() => setEditingId(null)} industryType={industryType} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
        {products.length === 0
          ? "Todavía no has agregado ningún producto."
          : `${products.length} producto${products.length === 1 ? "" : "s"} en tu catálogo.`}
      </p>
        {/* Ícono e input como hermanos en una fila flex con gap explícito
            — no superpuestos con position:absolute + padding, que en la
            práctica quedaba sin espacio real entre el ícono y el texto
            sin importar qué tanto padding se le agregara al Input. */}
        {products.length > 0 && (
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
              placeholder="Buscar producto..."
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              style={{ color: 'var(--nexora-ink)' }}
            />
          </div>
        )}
        {/* Antes: pastillas siempre visibles, una por categoría — con
            varias categorías se volvía una fila larga y desordenada.
            Ahora un solo filtro unificado, mismo patrón que el de fecha en
            Pedidos (orders-table.tsx): etiqueta fija "Filtra por
            categoría" cuando no hay filtro activo (evita el mismo bug de
            SelectValue mostrando el value crudo, ver nota allá), y el
            nombre real de la categoría en cuanto se elige una. "__all__"
            como valor centinela porque el Select no maneja bien null. */}
        {usedCategories.length > 0 && (
          <div className="flex justify-center">
            <Select
              value={categoryFilter ?? "__all__"}
              onValueChange={(v) => setCategoryFilter(v && v !== "__all__" ? v : null)}
            >
              <SelectTrigger className="w-56 justify-center gap-1.5">
                <ListFilter size={14} strokeWidth={1.75} />
                {categoryFilter ?? "Filtra por categoría"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {usedCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {products.length > 0 && (
          <div className="flex justify-center">
            <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
              <Download size={14} strokeWidth={1.75} />
              Exportar CSV
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium" style={{ color: 'var(--nexora-ink)' }}>
                  {p.name}
                </TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{p.category ?? "—"}</TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{formatCurrency(p.price, countryIso2)}</TableCell>
                <TableCell>
                  {p.stock !== null && p.stock < (p.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD) ? (
                    <span
                      className="inline-flex items-center gap-1.5 font-medium"
                      style={{ color: 'var(--nexora-alert)' }}
                      title="Stock bajo"
                    >
                      <AlertTriangle size={14} strokeWidth={1.75} />
                      {p.stock}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--nexora-ink-dim)' }}>{p.stock ?? "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                    style={{ color: p.active ? 'var(--nexora-signal)' : 'var(--nexora-ink-dim)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: p.active ? 'var(--nexora-signal)' : 'var(--nexora-ink-dim)' }}
                    />
                    {p.active ? "Activo" : "Inactivo"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={togglingId === p.id}
                      onClick={() => handleToggle(p)}
                    >
                      {p.active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  No hay productos todavía.
                </TableCell>
              </TableRow>
            )}
            {products.length > 0 && filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  Ningún producto coincide con &quot;{query}&quot;.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
    </div>
  );
}
