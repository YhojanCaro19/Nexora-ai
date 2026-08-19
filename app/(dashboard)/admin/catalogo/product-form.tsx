"use client";

import { useRef, useState, type FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import { createProductAction, updateProductAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Product } from "@/lib/services/productService";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/validators/productSchema";

const EMPTY_FORM = { name: "", description: "", price: "", stock: "" };

// "100" -> "100", "1000" -> "1,000", "10000000" -> "10,000,000" — separador
// de miles mientras se escribe. Solo dígitos: se descarta cualquier otra
// cosa que se pegue o escriba (comas, letras, puntos).
function formatThousands(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

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
          price: formatThousands(String(editingProduct.price)),
          stock: editingProduct.stock === null ? "" : String(editingProduct.stock),
        }
      : EMPTY_FORM
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editingProduct?.image_url ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (!file) {
      setImageFile(null);
      return;
    }
    // Solo un filtro de UX (avisa antes de intentar subir) — la validación
    // real, contra el contenido de verdad del archivo, pasa en el server.
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setError("La imagen debe ser JPG o PNG");
      e.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price.replace(/,/g, "")),
      stock: form.stock === "" ? null : Number(form.stock),
    };

    const result = isEditing
      ? await updateProductAction(editingProduct.id, input, imageFile)
      : await createProductAction(input, imageFile);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (isEditing) {
      onDone?.();
    } else {
      setForm(EMPTY_FORM);
      setImageFile(null);
      onDone?.();
      setImagePreview(null);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
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
            <Label htmlFor="name" className="block text-center">Nombre</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="block text-center">Descripción</Label>
            <Textarea
              id="description"
              rows={3}
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) }))}
            />
            <p className="text-xs text-right" style={{ color: 'var(--nexora-ink-dim)' }}>
              {form.description.length}/{DESCRIPTION_MAX_LENGTH}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="block text-center">Precio</Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: formatThousands(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock" className="block text-center">Stock (opcional)</Label>
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

          <div className="space-y-2">
            <Label className="block text-center">
              Foto del producto (opcional) — la que el agente le muestra al cliente
            </Label>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative w-32 h-32 rounded-2xl border border-dashed overflow-hidden flex flex-col items-center justify-center gap-1.5 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
              >
                {imagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview local/remoto simple, no vale la pena next/image acá */}
                    <img src={imagePreview} alt="Vista previa" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-medium text-white">Cambiar</span>
                    </div>
                  </>
                ) : (
                  <>
                    <ImagePlus size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-ink-dim)' }} />
                    <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                      Subir foto
                    </span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                id="image"
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <p className="text-xs text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
              JPG o PNG, máximo 5MB.
            </p>
          </div>

          <div className="flex justify-center gap-3">
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
