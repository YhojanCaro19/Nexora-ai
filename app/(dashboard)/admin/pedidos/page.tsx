'use client';

import { Package } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function PedidosPage() {
  return (
    <EmptyStateSection
      icon={Package}
      title="Pedidos"
      description="Aquí verás los pedidos..."
    />
  );
}