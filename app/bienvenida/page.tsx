// app/bienvenida/page.tsx
//
// El layout ya garantizó: admin + onboarding pendiente. Acá solo se pasa el
// nombre que traiga la sesión (de user_metadata) como valor inicial del
// wizard.
import { getSessionProfile } from "@/lib/auth/get-session";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function BienvenidaPage() {
  const profile = await getSessionProfile();
  return <OnboardingWizard defaultFullName={profile?.fullName ?? ""} />;
}
