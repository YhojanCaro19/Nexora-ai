// app/(dashboard)/superadmin/perfil/page.tsx
//
// Mismo patrón que app/(dashboard)/admin/perfil/page.tsx — un solo panel
// unificado (identidad + seguridad + idioma), sin Cards — pero con los
// datos de la cuenta de superadmin, que vive en platform_admins en vez
// de business_members (ver profileService.ts, funciones *PlatformAdmin*).
import { getLocale } from "next-intl/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { getPlatformAdminProfileDetails } from "@/lib/services/profileService";
import { getRecentLoginEvents } from "@/lib/services/loginEventService";
import { ProfilePanel } from "./profile-panel";
import type { Locale } from "@/i18n/locales";

export default async function SuperadminPerfilPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [details, loginEvents, locale] = await Promise.all([
    getPlatformAdminProfileDetails(profile.userId, profile.fullName),
    getRecentLoginEvents(profile.userId),
    getLocale(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Perfil
      </h1>
      <ProfilePanel details={details} loginEvents={loginEvents} currentLocale={locale as Locale} />
    </div>
  );
}
