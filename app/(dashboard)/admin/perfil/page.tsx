// app/(dashboard)/admin/perfil/page.tsx
import { KeyRound, LogOut, Monitor } from "lucide-react";
import { getSessionProfile } from "@/lib/auth/get-session";
import { getProfileDetails } from "@/lib/services/profileService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from "@/components/ui/accordion";
import { IdentityForm } from "./identity-form";
import { PasswordSection } from "./password-section";
import { SignOutAllDevices } from "./sign-out-all-devices";
import { ActiveSessionsPreview } from "./active-sessions-preview";

export default async function PerfilPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const details = await getProfileDetails(profile.userId, profile.businessId, profile.role, profile.fullName);

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
            <Accordion>
              <AccordionItem value="password">
                <AccordionTrigger icon={<KeyRound size={16} strokeWidth={1.75} />}>
                  Cambiar contraseña
                </AccordionTrigger>
                <AccordionPanel>
                  <PasswordSection />
                </AccordionPanel>
              </AccordionItem>

              <AccordionItem value="sign-out-all">
                <AccordionTrigger icon={<LogOut size={16} strokeWidth={1.75} />}>
                  Cerrar sesión en todos los dispositivos
                </AccordionTrigger>
                <AccordionPanel>
                  <SignOutAllDevices />
                </AccordionPanel>
              </AccordionItem>

              <AccordionItem value="active-sessions">
                <AccordionTrigger icon={<Monitor size={16} strokeWidth={1.75} />}>
                  Sesiones activas
                </AccordionTrigger>
                <AccordionPanel>
                  <ActiveSessionsPreview />
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
