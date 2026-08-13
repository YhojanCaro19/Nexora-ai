// app/(dashboard)/superadmin/page.tsx
//
// El superadmin no tiene "Inicio" — no hace ventas, esos datos son de
// admin/colaborador. Entrar a /superadmin (ej. justo después del login)
// manda directo a la primera sección real, en vez de dar 404.
import { redirect } from "next/navigation";

export default function SuperAdminIndexPage() {
  redirect("/superadmin/negocios");
}
