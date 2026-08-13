// app/(dashboard)/admin/page.tsx
'use client';

import { LayoutDashboard } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function AdminHomePage() {
  return (
    <EmptyStateSection
      icon={LayoutDashboard}
      title="Inicio"
      description="Todavía por definir qué va a mostrar este panel..."
    />
  );
}
