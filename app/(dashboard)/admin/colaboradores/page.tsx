// app/(dashboard)/admin/colaboradores/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getCollaborators, getCollaboratorUsage } from "@/lib/services/collaboratorService";
import { ColaboradoresPanel } from "./colaboradores-panel";

export default async function ColaboradoresPage() {
  const profile = await getSessionProfile();
  const [collaborators, usage] = profile?.businessId
    ? await Promise.all([
        getCollaborators(profile.businessId),
        getCollaboratorUsage(profile.businessId),
      ])
    : [[], { used: 0, limit: 0 }];

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Colaboradores
      </h1>
      <ColaboradoresPanel collaborators={collaborators} usage={usage} />
    </div>
  );
}
