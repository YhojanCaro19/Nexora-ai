'use client';

import { Users } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function ColaboradoresPage() {
  return (
    <EmptyStateSection
      icon={Users}
      title="Colaboradores"
      description="Aquí verás y administrarás a tus colaboradores..."
    />
  );
}