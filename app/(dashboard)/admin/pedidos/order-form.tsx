"use client";

import { useState } from "react";
import { createOrderAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Product } from "@/lib/services/productService";
import type { OrderItem } from "@/lib/types/order";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

// Pedido manual (mostrador, teléfono) — mientras no exista el agente
// creándolos solo desde la conversación con el cliente.
export function OrderForm({ products }: { products: Product[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProducts = products.filter((p) => p.active);

  const items: OrderItem[] = activeProducts
    .filter((p) => (quantities[p.id] ?? 0) > 0)
    .map((p) => ({
      product_id: p.id,
      name: p.name,
      quantity: quantities[p.id],
      unit_price: p.price,
    }));

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = await createOrderAction(items);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setQuantities({});
  }

  if (activeProducts.length === 0) {
    return null; // sin productos activos no hay de dónde armar un pedido
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo pedido</CardTitle>
        <CardDescription>Registra un pedido manual (mostrador, teléfono).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p
            className="rounded-lg border p-3 text-sm"
            style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
          >
            {error}
          </p>
        )}

        <div className="space-y-2">
          {activeProducts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <div>
                <p style={{ color: 'var(--nexora-ink)' }}>{p.name}</p>
                <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>{currency.format(p.price)}</p>
              </div>
              <Input
                type="number"
                min="0"
                step="1"
                className="w-20"
                value={quantities[p.id] ?? ""}
                onChange={(e) =>
                  setQuantities((q) => ({ ...q, [p.id]: Number(e.target.value) || 0 }))
                }
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'var(--nexora-ink-dim)' }}>Total</span>
          <span className="font-medium" style={{ color: 'var(--nexora-ink)' }}>{currency.format(total)}</span>
        </div>

        <Button disabled={loading || items.length === 0} onClick={handleSubmit}>
          {loading ? "Creando..." : "Crear pedido"}
        </Button>
      </CardContent>
    </Card>
  );
}
