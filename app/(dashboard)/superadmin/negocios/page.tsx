'use client';

import { Building2 } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function NegociosPage() {
  return (
    <EmptyStateSection
      icon={Building2}
      title="Negocios"
      description="Aquí verás todos los negocios registrados en la plataforma..."
    />
  );
}