"use client";

import { useRef, useState, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { createProductAction, updateProductAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product } from "@/lib/services/productService";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/validators/productSchema";
import { OTHER_CATEGORY_OPTION } from "@/lib/config/productCategories";
import type { CatalogKind } from "@/lib/config/catalogKind";

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
  catalogKind,
  usedCategories,
}: {
  editingProduct?: Product | null;
  onDone?: () => void;
  catalogKind: CatalogKind;
  /** Categorías que el negocio ya creó (distintas, de sus productos). */
  usedCategories: string[];
}) {
  const isEditing = !!editingProduct;
  // Negocio de solo servicios: nunca hay stock (un servicio no tiene
  // inventario). Productos / ambos: el stock es obligatorio salvo que el
  // dueño apague "Llevar inventario de este" (escape para hechos a pedido).
  const stockApplies = catalogKind !== "servicios";
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
  // Al editar: si ya tenía un stock guardado, el inventario está activo.
  // Nuevo producto: activo por defecto (para negocios con productos).
  const [trackInventory, setTrackInventory] = useState(
    editingProduct ? editingProduct.stock !== null : stockApplies
  );

  // Categoría: la crea el negocio, no hay lista predefinida. El desplegable
  // muestra las que ya usó + "Nueva categoría" (input de texto). La
  // categoría de un producto que se está editando siempre está entre las
  // usadas, así que se pre-selecciona sola.
  const existingCategory = editingProduct?.category ?? "";
  const matchesOption = existingCategory !== "" && usedCategories.includes(existingCategory);
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

  const tracking = stockApplies && trackInventory;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (tracking && form.stock.trim() === "") {
      setError("El stock es obligatorio. Si este producto no lleva inventario, apaga «Llevar inventario».");
      return;
    }

    setLoading(true);

    const input = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price.replace(/,/g, "")),
      stock: tracking && form.stock !== "" ? Number(form.stock) : null,
      lowStockThreshold:
        tracking && form.lowStockThreshold !== "" ? Number(form.lowStockThreshold) : null,
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

  const inputCls = "border-white/10 bg-white/[0.03] text-center";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
        {/* Foto + nombre/descripción, lado a lado en desktop. */}
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-36 w-36 overflow-hidden rounded-2xl border border-dashed transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
              >
                {imagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview local/remoto simple, no vale la pena next/image acá */}
                    <img src={imagePreview} alt="Vista previa" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-xs font-medium text-white">Cambiar</span>
                    </div>
                  </>
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-1.5">
                    <ImagePlus size={24} strokeWidth={1.5} style={{ color: 'var(--nexora-ink-dim)' }} />
                    <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>Subir foto</span>
                  </span>
                )}
              </button>
              {imagePreview ? (
                <button
                  type="button"
                  onClick={clearImage}
                  className="inline-flex items-center gap-1 text-xs transition-colors"
                  style={{ color: 'var(--nexora-ink-dim)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nexora-alert)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nexora-ink-dim)')}
                >
                  <X size={12} /> Quitar
                </button>
              ) : (
                <p className="max-w-36 text-center text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
                  JPG o PNG, máx. 5MB. Opcional.
                </p>
              )}
              <input
                ref={fileInputRef}
                id="image"
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="block text-center">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre del producto"
                  required
                  className={inputCls}
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
                  placeholder="Descripción del producto"
                  className="resize-none border-white/10 bg-white/[0.03]"
                />
                <p className="text-center text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
                  {form.description.length} / {DESCRIPTION_MAX_LENGTH}
                </p>
              </div>
            </div>
          </div>

        {/* Precio + categoría. */}
        <div className="grid gap-4 sm:grid-cols-2">
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
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="block text-center">Categoría (opcional)</Label>
            <Select value={categorySelect} onValueChange={(v) => setCategorySelect(v ?? "")}>
              <SelectTrigger className="h-10 w-full justify-center border-white/10 bg-white/[0.03] text-sm">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                {usedCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
                <SelectItem value={OTHER_CATEGORY_OPTION}>＋ Nueva categoría</SelectItem>
              </SelectContent>
            </Select>
            {categorySelect === OTHER_CATEGORY_OPTION && (
              <Input
                value={categoryOther}
                onChange={(e) => setCategoryOther(e.target.value)}
                placeholder="Nombre de la categoría"
                maxLength={60}
                autoFocus
                className={`mt-1.5 ${inputCls}`}
              />
            )}
          </div>
        </div>

        {/* Inventario — solo negocios que venden productos. El toggle es el
            escape para productos sin stock (hechos a pedido). */}
        {stockApplies && (
          <div className="space-y-4 border-t pt-6" style={{ borderColor: 'var(--nexora-line)' }}>
            <p className="text-center text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--nexora-ink-dim)' }}>
              Inventario
            </p>
            <Label
              htmlFor="track-inventory"
              className="mx-auto flex w-fit items-center gap-2 font-normal"
              style={{ color: 'var(--nexora-ink)' }}
            >
              <Checkbox
                id="track-inventory"
                checked={trackInventory}
                onCheckedChange={(checked) => setTrackInventory(checked === true)}
              />
              Llevar inventario de este producto
            </Label>
            {trackInventory ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="stock" className="block text-center">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    placeholder="0"
                    required
                    className={inputCls}
                  />
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
                    className={inputCls}
                  />
                </div>
              </div>
            ) : (
              <p className="text-center text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                Este producto no lleva inventario — no se descuenta por venta ni avisa por stock bajo.
              </p>
            )}
          </div>
        )}

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
