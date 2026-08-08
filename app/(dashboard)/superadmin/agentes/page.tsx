'use client';

import { Bot } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function AgentesPage() {
  return (
    <EmptyStateSection
      icon={Bot}
      title="Agentes"
      description="Aquí administrarás los agentes de IA disponibles en la plataforma..."
    />
  );
}