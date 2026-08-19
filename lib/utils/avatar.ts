// lib/utils/avatar.ts
//
// Iniciales a partir de un nombre completo — usado como fallback visual
// cuando no hay foto de perfil. Antes vivía solo en identity-form.tsx;
// se movió acá porque components/shared/Avatar.tsx (Sidebar + Perfil) lo
// necesita en dos sitios y duplicarlo hubiera sido la misma inconsistencia
// que el sistema de diseño busca evitar.
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}
