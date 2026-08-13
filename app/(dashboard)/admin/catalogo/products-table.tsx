"use client";

import { useState } from "react";
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

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function ProductsTable({ products }: { products: Product[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const editing = products.find((p) => p.id === editingId) ?? null;

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
      <CardContent>
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
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium" style={{ color: 'var(--nexora-ink)' }}>
                  {p.name}
                </TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{currency.format(p.price)}</TableCell>
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
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
