'use client';

import { FileText } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function ReportesPage() {
  return (
    <EmptyStateSection
      icon={FileText}
      title="Reportes"
      description="Aquí verás tus reportes de ventas..."
    />
  );
}