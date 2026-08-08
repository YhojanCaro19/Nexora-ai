'use client';

import { UserCircle } from "lucide-react";
import { EmptyStateSection } from "@/components/dashboard/shared/EmptyStateSection";

export default function PerfilPage() {
  return (
    <EmptyStateSection
      icon={UserCircle}
      title="Perfil"
      description="Aquí administrarás tu perfil y configuración de cuenta..."
    />
  );
}