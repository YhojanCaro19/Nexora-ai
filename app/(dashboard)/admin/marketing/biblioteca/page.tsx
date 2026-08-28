// app/(dashboard)/admin/marketing/biblioteca/page.tsx
//
// Probador de generación de imágenes sueltas. Sirve para validar el
// proveedor (Gemini) y el cobro. La biblioteca real de creativos guardados
// es fase aparte.
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MarketingPanel } from "../marketing-panel";

export default function BibliotecaPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--nexora-ink-dim)" }}
      >
        <ChevronLeft size={16} />
        Mis estrategias
      </Link>
      <MarketingPanel />
    </div>
  );
}
