// app/(dashboard)/admin/perfil/page.tsx
import { getLocale } from "next-intl/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { getProfileDetails } from "@/lib/services/profileService";
import { getRecentLoginEvents } from "@/lib/services/loginEventService";
import { getProfileSecurityEvents } from "@/lib/services/profileSecurityLogService";
import { getBillingSummary } from "@/lib/services/creditService";
import { getAgentUsageForBusiness } from "@/lib/services/agentUsageService";
import { getAccessChangeEligibility } from "@/lib/services/accountChangeService";
import type { Locale } from "@/i18n/locales";
import { ProfilePanel } from "./profile-panel";

export default async function PerfilPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const locale = (await getLocale()) as Locale;

  const [details, loginEvents, securityEvents, billing, agentUsage, accessChange] =
    await Promise.all([
      getProfileDetails(profile.userId, profile.businessId, profile.role, profile.fullName),
      getRecentLoginEvents(profile.userId),
      profile.businessId
        ? getProfileSecurityEvents(profile.userId, profile.businessId)
        : Promise.resolve([]),
      profile.businessId ? getBillingSummary(profile.businessId) : Promise.resolve(null),
      profile.businessId
        ? getAgentUsageForBusiness(profile.businessId)
        : Promise.resolve(null),
      profile.businessId
        ? getAccessChangeEligibility(profile.userId, profile.businessId)
        : Promise.resolve({ lastChangedAt: null, nextEligibleAt: null, pendingRequest: null }),
    ]);

  return (
    <div className="space-y-8">
      <h1 className="font-nexora text-xl text-center" style={{ color: "var(--nexora-ink)" }}>
        Perfil
      </h1>

      <ProfilePanel
        details={details}
        loginEvents={loginEvents}
        securityEvents={securityEvents}
        billing={billing}
        agentUsage={agentUsage}
        accessChange={accessChange}
        currentLocale={locale}
        canManageBilling={profile.role === "admin"}
      />
    </div>
  );
}
