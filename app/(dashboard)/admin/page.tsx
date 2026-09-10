// app/(dashboard)/admin/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { HomeDashboard } from "./home-dashboard";

export default async function AdminHomePage() {
  const profile = await getSessionProfile();
  return <HomeDashboard businessId={profile?.businessId ?? null} />;
}
