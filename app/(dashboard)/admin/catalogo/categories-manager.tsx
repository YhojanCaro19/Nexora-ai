"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, X, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategoryAction, deleteCategoryAction } from "./actions";
import type { ProductCategory } from "@/lib/services/productCategoryService";

// Acordeón de categorías del Catálogo: siempre visible, lista las que el
// negocio creó + una fila para agregar una nueva. Las categorías viven en
// `product_categories` (docs/sql/product-categories.sql).
export function CategoriesManager({ categories }: { categories: ProductCategory[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    start(async () => {
      const res = await createCategoryAction(name);
      if (res.error) {
        setError(res.error);
        return;
      }
      setNewName("");
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    start(async () => {
      const res = await deleteCategoryAction(id);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--nexora-line)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Tag size={15} strokeWidth={1.75} style={{ color: "var(--nexora-ink-dim)" }} />
        <span className="flex-1 text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
          Categorías
        </span>
        <span className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          {categories.length}
        </span>
        <ChevronDown
          size={16}
          className="transition-transform"
          style={{ color: "var(--nexora-ink-dim)", transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t px-4 py-3" style={{ borderColor: "var(--nexora-line)" }}>
          {categories.length === 0 ? (
            <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
              Todavía no tienes categorías. Agrega la primera.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                  style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
                >
                  {c.name}
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    disabled={pending}
                    aria-label={`Quitar ${c.name}`}
                    className="transition-colors hover:text-[var(--nexora-alert)]"
                    style={{ color: "var(--nexora-ink-dim)" }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Nueva categoría"
              maxLength={60}
              className="h-9 flex-1 border-white/10 bg-white/[0.03]"
            />
            <Button type="button" size="sm" onClick={add} disabled={pending || !newName.trim()}>
              <Plus size={14} strokeWidth={2} />
              Agregar
            </Button>
          </div>

          {error && (
            <p className="text-center text-xs" style={{ color: "var(--nexora-alert)" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
