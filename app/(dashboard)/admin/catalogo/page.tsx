'use client';

import { LayoutGrid } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function CatalogoPage() {
  return (
    <EmptyStateSection
      icon={LayoutGrid}
      title="Catálogo"
      description="Aquí verás tu catálogo de productos y servicios..."
    />
  );
}