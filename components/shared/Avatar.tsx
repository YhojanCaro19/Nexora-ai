// components/shared/Avatar.tsx
//
// Círculo de foto de perfil, solo visualización (sin click-to-upload —
// eso vive exclusivamente en identity-form.tsx, que envuelve este mismo
// componente dentro de su propio <button>). Usado en el navbar global
// (Sidebar, chico, junto al roleLabel) y en Perfil (grande, como
// encabezado de la card Identidad) para no duplicar el fallback de
// iniciales ni el estilado del círculo en dos sitios distintos.
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils/avatar";

interface AvatarProps {
  url?: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ url, name, size = 32, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border",
        className
      )}
      style={{ width: size, height: size, borderColor: "var(--nexora-line)", background: "var(--nexora-secondary)" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview local/remoto simple, mismo criterio que el logo del negocio
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span
          className="font-nexora leading-none"
          style={{ color: "var(--nexora-ink)", fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {getInitials(name)}
        </span>
      )}
    </span>
  );
}
