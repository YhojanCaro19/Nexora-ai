// app/(dashboard)/admin/colaboradores/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getCollaborators } from "@/lib/services/collaboratorService";
import { ColaboradoresPanel } from "./colaboradores-panel";

export default async function ColaboradoresPage() {
  const profile = await getSessionProfile();
  const collaborators = profile?.businessId
    ? await getCollaborators(profile.businessId)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Colaboradores
      </h1>
      <ColaboradoresPanel collaborators={collaborators} />
    </div>
  );
}
