'use client';

import { Bot } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function MiAgentePage() {
  return (
    <EmptyStateSection
      icon={Bot}
      title="Mi Agente"
      description="Aquí configurarás tu agente de ventas..."
    />
  );
}