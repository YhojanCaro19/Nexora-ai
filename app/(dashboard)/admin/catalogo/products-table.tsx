"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { toggleProductActiveAction } from "./actions";
import { ProductForm } from "./product-form";
import type { Product } from "@/lib/services/productService";
import { formatCurrency } from "@/lib/utils/currency";

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
        {products.length > 0 && (
          <div className="relative max-w-sm mx-auto">
            <Search
              size={14}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--nexora-ink-dim)' }}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="pl-9"
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
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{p.stock ?? "—"}</TableCell>
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
