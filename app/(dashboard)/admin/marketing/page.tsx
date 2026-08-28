// app/(dashboard)/admin/marketing/page.tsx
//
// Marketing IA — por ahora solo el probador de generación de imágenes
// (valida el proveedor Gemini + el cobro en créditos). La estrategia,
// copy y campañas son fase aparte. El rol ya lo validó el layout de /admin.
import { MarketingPanel } from "./marketing-panel";

export default function MarketingPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Marketing IA
      </h1>
      <MarketingPanel />
    </div>
  );
}
