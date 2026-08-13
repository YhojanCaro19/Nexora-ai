"use client";

import { useState } from "react";
import { PackagePlus, LayoutGrid, ChevronLeft } from "lucide-react";
import { ProductForm } from "./product-form";
import { ProductsTable } from "./products-table";
import type { Product } from "@/lib/services/productService";

type View = "chooser" | "new" | "list";

export function CatalogoPanel({ products }: { products: Product[] }) {
  const [view, setView] = useState<View>("chooser");

  if (view === "chooser") {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-10">
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

      {view === "new" ? (
        <ProductForm onDone={() => setView("list")} />
      ) : (
        <ProductsTable products={products} />
      )}
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
      className="flex flex-col items-center justify-center gap-3 w-48 h-48 rounded-3xl border transition-all duration-300 hover:scale-105"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <Icon size={32} strokeWidth={1.5} style={{ color: accent }} />
      <span className="text-sm font-medium text-center px-2" style={{ color: 'var(--nexora-ink)' }}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-2xl font-light" style={{ color: 'var(--nexora-ink-dim)' }}>
          {count}
        </span>
      )}
    </button>
  );
}
