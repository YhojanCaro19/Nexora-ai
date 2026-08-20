"use client";

import { useMemo, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toggleProductActiveAction } from "./actions";
import { ProductForm } from "./product-form";
import type { Product } from "@/lib/services/productService";
import { formatCurrency } from "@/lib/utils/currency";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/validators/productSchema";

export function ProductsTable({
  products,
  countryIso2,
}: {
  products: Product[];
  countryIso2: string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const editing = products.find((p) => p.id === editingId) ?? null;

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  async function handleToggle(product: Product) {
    setTogglingId(product.id);
    await toggleProductActiveAction(product.id, !product.active);
    setTogglingId(null);
  }

  if (editing) {
    return <ProductForm editingProduct={editing} onDone={() => setEditingId(null)} />;
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Catálogo</CardTitle>
        <CardDescription>
          {products.length === 0
            ? "Todavía no has agregado ningún producto."
            : `${products.length} producto${products.length === 1 ? "" : "s"} en tu catálogo.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
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
                <TableCell colSpan={5} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  No hay productos todavía.
                </TableCell>
              </TableRow>
            )}
            {products.length > 0 && filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  Ningún producto coincide con &quot;{query}&quot;.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
