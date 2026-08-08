'use client';

import { Settings } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function ConfiguracionPage() {
  return (
    <EmptyStateSection
      icon={Settings}
      title="Configuración"
      description="Aquí administrarás la configuración general de la plataforma..."
    />
  );
}