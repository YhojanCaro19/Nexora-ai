"use client";

import { useState, type FormEvent } from "react";
import { createProductAction, updateProductAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Product } from "@/lib/services/productService";

const EMPTY_FORM = { name: "", description: "", price: "", stock: "" };

// Mismo formulario sirve para crear y para editar — si le pasan
// `editingProduct`, cambia a modo edición y llama a onDone al terminar.
export function ProductForm({
  editingProduct,
  onDone,
}: {
  editingProduct?: Product | null;
  onDone?: () => void;
}) {
  const isEditing = !!editingProduct;
  const [form, setForm] = useState(
    editingProduct
      ? {
          name: editingProduct.name,
          description: editingProduct.description ?? "",
          price: String(editingProduct.price),
          stock: editingProduct.stock === null ? "" : String(editingProduct.stock),
        }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      stock: form.stock === "" ? null : Number(form.stock),
    };

    const result = isEditing
      ? await updateProductAction(editingProduct.id, input)
      : await createProductAction(input);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (isEditing) {
      onDone?.();
    } else {
      setForm(EMPTY_FORM);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Editar producto" : "Nuevo producto"}</CardTitle>
        {!isEditing && (
          <CardDescription>Agrega un producto a tu catálogo.</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <p
            className="mb-4 rounded-lg border p-3 text-sm"
            style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
          >
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock">Stock (opcional)</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Agregar producto"}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={onDone}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
