"use client";

import { useRef, useState, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { createProductAction, updateProductAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product } from "@/lib/services/productService";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/validators/productSchema";
import { getCategoryOptions, OTHER_CATEGORY_OPTION } from "@/lib/config/productCategories";

const EMPTY_FORM = { name: "", description: "", price: "", stock: "", lowStockThreshold: "" };

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
  industryType,
}: {
  editingProduct?: Product | null;
  onDone?: () => void;
  industryType: string | null;
}) {
  const isEditing = !!editingProduct;
  const [form, setForm] = useState(
    editingProduct
      ? {
          name: editingProduct.name,
          description: editingProduct.description ?? "",
          price: formatThousands(String(editingProduct.price)),
          stock: editingProduct.stock === null ? "" : String(editingProduct.stock),
          lowStockThreshold:
            editingProduct.low_stock_threshold === null ? "" : String(editingProduct.low_stock_threshold),
        }
      : EMPTY_FORM
  );

  // Categoría: lista sugerida por industria + "Otra" como escape hatch a
  // texto libre. Si el producto ya tenía una categoría que NO está en la
  // lista sugerida (dato viejo, o cambió de industria), se trata como
  // "Otra" con ese texto — nunca se pierde el dato ni se fuerza a encajar
  // en una opción que no aplica.
  const categoryOptions = getCategoryOptions(industryType);
  const existingCategory = editingProduct?.category ?? "";
  const matchesOption = existingCategory && categoryOptions.includes(existingCategory);
  const [categorySelect, setCategorySelect] = useState(
    existingCategory ? (matchesOption ? existingCategory : OTHER_CATEGORY_OPTION) : ""
  );
  const [categoryOther, setCategoryOther] = useState(matchesOption ? "" : existingCategory);

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

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      lowStockThreshold: form.lowStockThreshold === "" ? null : Number(form.lowStockThreshold),
      category: categorySelect === OTHER_CATEGORY_OPTION ? categoryOther.trim() || undefined : categorySelect || undefined,
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
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-nexora text-lg" style={{ color: 'var(--nexora-ink)' }}>
          {isEditing ? "Editar producto" : "Nuevo producto"}
        </h2>
        <p className="text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>
          {isEditing ? "Actualiza los datos de este producto." : "Agrega un producto a tu catálogo."}
        </p>
      </div>

      {error && (
        <p
          className="rounded-lg border p-3 text-sm text-center"
          style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Foto — grande y centrada, lo primero que se ve. */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative w-40 h-40 rounded-2xl border border-dashed overflow-hidden flex flex-col items-center justify-center gap-2 transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
          >
            {imagePreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- preview local/remoto simple, no vale la pena next/image acá */}
                <img src={imagePreview} alt="Vista previa" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-white">Cambiar foto</span>
                </div>
              </>
            ) : (
              <>
                <ImagePlus size={26} strokeWidth={1.5} style={{ color: 'var(--nexora-ink-dim)' }} />
                <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                  Subir foto
                </span>
              </>
            )}
          </button>

          {imagePreview && (
            <button
              type="button"
              onClick={clearImage}
              className="inline-flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--nexora-ink-dim)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nexora-alert)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nexora-ink-dim)')}
            >
              <X size={12} />
              Quitar foto
            </button>
          )}

          <p className="text-xs text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
            Foto del producto (opcional). JPG o PNG, máximo 5MB.
          </p>

          <input
            ref={fileInputRef}
            id="image"
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="block text-center">Nombre</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej. Corte con barba"
            required
            className="text-center"
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
            placeholder="Lo que el agente usa para responder — cuanto más claro, mejor."
          />
          <p className="text-[11px] text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
            {form.description.length} / {DESCRIPTION_MAX_LENGTH}
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
              placeholder="20,000"
              required
              className="text-center"
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
              placeholder="—"
              className="text-center"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="block text-center">Categoría (opcional)</Label>
            <Select value={categorySelect} onValueChange={(v) => setCategorySelect(v ?? "")}>
              <SelectTrigger className="w-full h-10 text-sm justify-center">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categorySelect === OTHER_CATEGORY_OPTION && (
              <Input
                value={categoryOther}
                onChange={(e) => setCategoryOther(e.target.value)}
                placeholder="Escribe la categoría"
                maxLength={60}
                className="mt-1.5 text-center"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="low-stock-threshold" className="block text-center">
              Aviso de stock bajo (opcional)
            </Label>
            <Input
              id="low-stock-threshold"
              type="number"
              min="1"
              step="1"
              placeholder="5"
              value={form.lowStockThreshold}
              onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
              className="text-center"
            />
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
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
    </div>
  );
}
