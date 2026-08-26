"use client";

import { useState } from "react";
import { PackagePlus, LayoutGrid, ChevronLeft, ChevronRight, UploadCloud } from "lucide-react";
import { ProductForm } from "./product-form";
import { ProductsTable } from "./products-table";
import { BulkImport } from "./bulk-import";
import type { Product } from "@/lib/services/productService";

type View = "chooser" | "new" | "list" | "import";

export function CatalogoPanel({
  products,
  countryIso2,
  industryType,
}: {
  products: Product[];
  countryIso2: string | null;
  industryType: string | null;
}) {
  const [view, setView] = useState<View>("chooser");

  if (view === "chooser") {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 py-4 sm:py-10">
        <ChooserButton
          icon={PackagePlus}
          label="Agregar nuevo producto"
          accent="var(--nexora-nova)"
          onClick={() => setView("new")}
        />
        <ChooserButton
          icon={LayoutGrid}
          label="Ver catálogo"
          count={products.length}
          accent="var(--nexora-nova)"
          onClick={() => setView("list")}
        />
        <ChooserButton
          icon={UploadCloud}
          label="Importar catálogo (CSV)"
          accent="var(--nexora-nova)"
          onClick={() => setView("import")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setView("chooser")}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
        style={{ color: 'var(--nexora-ink-dim)' }}
      >
        <ChevronLeft size={16} />
        Volver
      </button>

      {view === "new" && <ProductForm onDone={() => setView("list")} industryType={industryType} />}
      {view === "list" && (
        <ProductsTable products={products} countryIso2={countryIso2} industryType={industryType} />
      )}
      {view === "import" && <BulkImport onDone={() => setView("list")} />}
    </div>
  );
}

function ChooserButton({
  icon: Icon,
  label,
  count,
  accent,
  onClick,
}: {
  icon: typeof PackagePlus;
  label: string;
  count?: number;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      // Mismo tratamiento que ChooserButton en Pedidos (pedidos-panel.tsx)
      // — mismo pedido, mismo problema: el cuadrado de 192x192 apilado 3
      // veces en columna desbordaba el viewport de un teléfono. Móvil:
      // fila compacta de ancho completo. Desktop (sm:+): el mismo
      // cuadrado grande de siempre, sin cambios.
      className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 hover:bg-white/[0.04] sm:w-48 sm:h-48 sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:rounded-3xl sm:p-0 sm:text-center sm:hover:scale-105 sm:hover:bg-transparent"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nexora-muted)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent">
        <Icon size={20} strokeWidth={1.5} className="sm:hidden" style={{ color: accent }} />
        <Icon size={32} strokeWidth={1.5} className="hidden sm:block" style={{ color: accent }} />
      </span>

      <span className="min-w-0 flex-1 sm:flex-none">
        <span className="block text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
          {label}
        </span>
        {count !== undefined && (
          <span className="block text-xs mt-0.5 sm:hidden" style={{ color: 'var(--nexora-ink-dim)' }}>
            {count} producto{count === 1 ? "" : "s"}
          </span>
        )}
      </span>

      {count !== undefined && (
        <span className="hidden text-2xl font-light sm:block" style={{ color: 'var(--nexora-ink-dim)' }}>
          {count}
        </span>
      )}

      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 sm:hidden" style={{ color: 'var(--nexora-ink-dim)' }} />
    </button>
  );
}
