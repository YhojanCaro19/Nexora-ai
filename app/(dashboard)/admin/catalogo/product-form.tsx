"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Check as CheckIcon } from "lucide-react";
import { createProductAction, updateProductAction, createCategoryAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product } from "@/lib/services/productService";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/validators/productSchema";
import type { CatalogKind } from "@/lib/config/catalogKind";

const NEW_CATEGORY_OPTION = "__new__";

// El aviso de stock bajo es obligatorio cuando se lleva inventario —
// arranca con el default para que no estorbe, pero se puede cambiar.
const EMPTY_FORM = { name: "", description: "", price: "", stock: "", lowStockThreshold: "5" };

// Degradado de marca (cian → violeta) reutilizado para bordes y detalles
// finos — mismo criterio que el wizard de bienvenida.
const BRAND_GRADIENT = "linear-gradient(110deg, #4CC2E8, #818CF8, #A78BFA)";
// Relleno translúcido + borde tenue de los inputs, igual que /bienvenida.
// El anillo blanco de foco se apaga: el resplandor de marca lo pone
// <GlowField> alrededor (borde en degradado al enfocar, como "Subir foto").
const FIELD_CLS =
  "h-10 border-white/10 bg-white/[0.03] focus-visible:border-white/10 focus-visible:ring-0";
const TEXTAREA_CLS =
  "resize-none border-white/10 bg-white/[0.03] focus-visible:border-white/10 focus-visible:ring-0";

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
  categoryNames,
}: {
  editingProduct?: Product | null;
  onDone?: () => void;
  catalogKind: CatalogKind;
  /** Nombres de categoría que ofrece el selector (creadas + las que ya
   *  tiene algún producto). */
  categoryNames: string[];
}) {
  const router = useRouter();
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
            editingProduct.low_stock_threshold === null ? "5" : String(editingProduct.low_stock_threshold),
        }
      : EMPTY_FORM
  );
  // Al editar: si ya tenía un stock guardado, el inventario está activo.
  // Nuevo producto: activo por defecto (para negocios con productos).
  const [trackInventory, setTrackInventory] = useState(
    editingProduct ? editingProduct.stock !== null : stockApplies
  );

  // Categoría: la crea el negocio (product_categories). El selector muestra
  // las existentes + "＋ Nueva categoría", que abre un mini-form inline
  // (input + Crear) — al crear se guarda en la DB y queda seleccionada.
  const existingCategory = editingProduct?.category ?? "";
  const [categorySelect, setCategorySelect] = useState(
    existingCategory && categoryNames.includes(existingCategory) ? existingCategory : ""
  );
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryPending, startCategory] = useTransition();

  function createCategory() {
    const name = newCategory.trim();
    if (!name) return;
    setCategoryError(null);
    startCategory(async () => {
      const res = await createCategoryAction(name);
      if (res.error || !res.category) {
        setCategoryError(res.error ?? "No se pudo crear la categoría.");
        return;
      }
      setCategorySelect(res.category.name);
      setCreatingCategory(false);
      setNewCategory("");
      router.refresh();
    });
  }

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

    if (tracking && form.lowStockThreshold.trim() === "") {
      setError("El aviso de stock bajo es obligatorio: indica con cuántas unidades quieres que te avise.");
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
      category: categorySelect || undefined,
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
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2 text-center">
        <h2 className="font-nexora text-xl" style={{ color: "var(--nexora-ink)" }}>
          {isEditing ? "Editar producto" : "Nuevo producto"}
        </h2>
        <p className="text-sm" style={{ color: "var(--nexora-ink-dim)" }}>
          {isEditing
            ? "Actualiza los datos de este producto."
            : "Agrega un producto a tu catálogo."}
        </p>
      </header>

      {error && (
        <p
          className="rounded-lg border p-3 text-center text-sm"
          style={{
            borderColor: "rgba(248,113,113,0.3)",
            background: "rgba(248,113,113,0.08)",
            color: "var(--nexora-alert)",
          }}
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-9">
        {/* PRODUCTO — foto protagonista + nombre y descripción. */}
        <section className="space-y-5">
          <SectionHeading>Producto</SectionHeading>

          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
            <div className="flex w-full max-w-[15rem] shrink-0 flex-col gap-2 sm:w-52">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={imagePreview ? "Cambiar foto del producto" : "Subir foto del producto"}
                className={`group relative aspect-square w-full flex-1 overflow-hidden rounded-2xl border transition-colors focus-visible:outline-none sm:aspect-auto sm:min-h-[11rem] ${
                  imagePreview ? "border-transparent" : "border-dashed border-white/15"
                }`}
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                {/* Borde de degradado de marca por máscara — aparece al pasar
                    el cursor o con foco de teclado, sin pintar el relleno. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{
                    padding: "1px",
                    background: BRAND_GRADIENT,
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                />
                {imagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview local/remoto simple, no vale la pena next/image acá */}
                    <img
                      src={imagePreview}
                      alt="Vista previa"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <span className="text-xs font-medium text-white">Cambiar foto</span>
                    </span>
                  </>
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <ImagePlus size={20} strokeWidth={1.5} style={{ color: "var(--nexora-ink-dim)" }} />
                    </span>
                    <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                      Subir foto
                    </span>
                  </span>
                )}
              </button>

              {imagePreview ? (
                <button
                  type="button"
                  onClick={clearImage}
                  className="mx-auto inline-flex items-center gap-1 text-[11px] transition-colors"
                  style={{ color: "var(--nexora-ink-dim)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nexora-alert)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--nexora-ink-dim)")}
                >
                  <X size={12} /> Quitar foto
                </button>
              ) : (
                <p className="text-center text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>
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

            <div className="w-full flex-1 space-y-4">
              <Field label="Nombre" htmlFor="name">
                <GlowField>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre del producto"
                    required
                    className={FIELD_CLS}
                  />
                </GlowField>
              </Field>

              <Field label="Descripción" htmlFor="description">
                <GlowField>
                  <Textarea
                    id="description"
                    rows={4}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) }))
                    }
                    placeholder="Descripción del producto"
                    className={TEXTAREA_CLS}
                  />
                </GlowField>
                <p
                  className="text-right text-[10px] tabular-nums"
                  style={{ color: "var(--nexora-ink-dim)", opacity: 0.7 }}
                >
                  {form.description.length} / {DESCRIPTION_MAX_LENGTH}
                </p>
              </Field>
            </div>
          </div>
        </section>

        {/* PRECIO Y CATEGORÍA. */}
        <section className="space-y-5">
          <SectionHeading>Precio y categoría</SectionHeading>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio" htmlFor="price">
              <GlowField>
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm"
                  style={{ color: "var(--nexora-ink-dim)" }}
                >
                  $
                </span>
                <Input
                  id="price"
                  type="text"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: formatThousands(e.target.value) }))}
                  placeholder="20,000"
                  required
                  className={`${FIELD_CLS} pl-7`}
                />
              </GlowField>
            </Field>

            <Field label="Categoría (opcional)" htmlFor="category">
              {creatingCategory ? (
                <div className="flex items-center gap-2">
                  <GlowField className="flex-1">
                    <Input
                      id="category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          createCategory();
                        }
                        if (e.key === "Escape") {
                          setCreatingCategory(false);
                          setNewCategory("");
                        }
                      }}
                      placeholder="Nombre de la categoría"
                      maxLength={60}
                      autoFocus
                      className={FIELD_CLS}
                    />
                  </GlowField>
                  <Button
                    type="button"
                    size="icon"
                    onClick={createCategory}
                    disabled={categoryPending || !newCategory.trim()}
                    aria-label="Crear categoría"
                  >
                    <CheckIcon size={15} strokeWidth={2} />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      setCreatingCategory(false);
                      setNewCategory("");
                      setCategoryError(null);
                    }}
                    aria-label="Cancelar"
                  >
                    <X size={15} />
                  </Button>
                </div>
              ) : (
                <Select
                  value={categorySelect || undefined}
                  onValueChange={(v) => {
                    if (v === NEW_CATEGORY_OPTION) {
                      setCreatingCategory(true);
                      return;
                    }
                    setCategorySelect(v ?? "");
                  }}
                >
                  <GlowField>
                    <SelectTrigger
                      id="category"
                      className="h-10 w-full justify-center border-white/10 bg-white/[0.03] text-sm focus-visible:border-white/10 focus-visible:ring-0"
                    >
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                  </GlowField>
                  <SelectContent>
                    {categoryNames.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_CATEGORY_OPTION}>＋ Nueva categoría</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {categoryError && (
                <p className="text-center text-[11px]" style={{ color: "var(--nexora-alert)" }}>
                  {categoryError}
                </p>
              )}
            </Field>
          </div>
        </section>

        {/* INVENTARIO — solo negocios que venden productos. El toggle es el
            escape para productos sin stock (hechos a pedido). */}
        {stockApplies && (
          <section className="space-y-4">
            <SectionHeading>Inventario</SectionHeading>

            <Label
              htmlFor="track-inventory"
              className="mx-auto flex w-fit items-center gap-2 font-normal"
              style={{ color: "var(--nexora-ink)" }}
            >
              <Checkbox
                id="track-inventory"
                checked={trackInventory}
                onCheckedChange={(checked) => setTrackInventory(checked === true)}
                // Marcado con el degradado de marca de la landing (cian →
                // violeta) en vez del verde, solo en este formulario.
                style={
                  trackInventory
                    ? { backgroundColor: "transparent", backgroundImage: BRAND_GRADIENT, borderColor: "transparent" }
                    : undefined
                }
              />
              Llevar inventario de este producto
            </Label>

            {trackInventory ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Stock" htmlFor="stock">
                  <GlowField>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                      placeholder="0"
                      required
                      className={FIELD_CLS}
                    />
                  </GlowField>
                </Field>
                <Field label="Aviso de stock bajo" htmlFor="low-stock-threshold">
                  <GlowField>
                    <Input
                      id="low-stock-threshold"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="5"
                      value={form.lowStockThreshold}
                      onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
                      required
                      className={FIELD_CLS}
                    />
                  </GlowField>
                </Field>
              </div>
            ) : (
              <p className="mx-auto max-w-sm text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
                Este producto no lleva inventario — no se descuenta por venta ni avisa por stock bajo.
              </p>
            )}
          </section>
        )}

        <div className="flex justify-center gap-3 pt-1">
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

/* --- piezas internas --- */

// Rótulo de sección centrado con dos filetes cortos teñidos de marca —
// da estructura sin encerrar nada en una tarjeta (reemplaza el border-t
// gris pelado). Mismo lenguaje visual que el wizard de bienvenida.
function SectionHeading({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        aria-hidden
        className="h-px w-8 rounded-full"
        style={{ background: "linear-gradient(90deg, transparent, rgba(129,140,248,0.45))" }}
      />
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="h-px w-8 rounded-full"
        style={{ background: "linear-gradient(90deg, rgba(129,140,248,0.45), transparent)" }}
      />
    </div>
  );
}

// Envuelve un control y le pinta un borde en degradado de marca al
// enfocarlo (máscara, sin tapar el relleno) — el mismo resplandor que
// "Subir foto", en vez del anillo blanco por defecto.
function GlowField({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`group/glow relative rounded-lg ${className}`}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-focus-within/glow:opacity-100"
        style={{
          padding: "1px",
          background: BRAND_GRADIENT,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
    </div>
  );
}

// Campo con label centrado en text-xs/tracking sobre el control — la
// estética de /bienvenida que el usuario aprobó.
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="justify-center text-xs tracking-wide"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
