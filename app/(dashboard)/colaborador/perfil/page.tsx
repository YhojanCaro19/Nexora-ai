// app/(dashboard)/colaborador/perfil/page.tsx
//
// Se reutiliza directo el mismo IdentityForm/SecurityPanel y las mismas
// server actions que usa admin/perfil — ninguna de esas actions exige
// role === "admin", solo profile.businessId (que un colaborador también
// tiene), así que ya funcionan para este rol tal cual. Mismo criterio que
// colaborador/pedidos/page.tsx reutilizando PedidosPanel de admin.
import { getSessionProfile } from "@/lib/auth/get-session";
import { getProfileDetails } from "@/lib/services/profileService";
import { getRecentLoginEvents } from "@/lib/services/loginEventService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IdentityForm } from "@/app/(dashboard)/admin/perfil/identity-form";
import { SecurityPanel } from "@/app/(dashboard)/admin/perfil/security-panel";

export default async function ColaboradorPerfilPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [details, loginEvents] = await Promise.all([
    getProfileDetails(profile.userId, profile.businessId, profile.role, profile.fullName),
    getRecentLoginEvents(profile.userId),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Perfil
      </h1>

      <div className="max-w-2xl mx-auto space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Identidad</CardTitle>
            <CardDescription>Tu foto y tus datos personales dentro del negocio.</CardDescription>
          </CardHeader>
          <CardContent>
            <IdentityForm details={details} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>Contraseña y sesiones activas de tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent>
            <SecurityPanel loginEvents={loginEvents} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
