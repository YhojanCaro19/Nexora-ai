// app/(dashboard)/admin/perfil/page.tsx
import { UserCircle } from "lucide-react";
import { getSessionProfile } from "@/lib/auth/get-session";
import { getProfileDetails } from "@/lib/services/profileService";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { PasswordSection } from "./password-section";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  superadmin: "Superadmin",
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </dt>
      <dd className="text-base font-semibold mt-0.5" style={{ color: 'var(--nexora-ink)' }}>
        {value}
      </dd>
    </div>
  );
}

export default async function PerfilPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const details = await getProfileDetails(profile.userId, profile.businessId, profile.role, profile.fullName);

  return (
    <div className="space-y-8">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Perfil
      </h1>

      <section
        className="rounded-2xl border p-8 space-y-8 max-w-2xl mx-auto"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <UserCircle size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
          <h2 className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--nexora-nova)' }}>
            Información de la cuenta
          </h2>
          <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
            Datos con los que quedó registrada tu cuenta.
          </p>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          <InfoField label="Nombre" value={details.fullName} />
          <InfoField label="Correo" value={details.email ?? "—"} />
          <InfoField label="Teléfono" value={details.phone ? formatPhoneDisplay(details.phone) : "—"} />
          <InfoField label="Rol" value={ROLE_LABELS[details.role] ?? details.role} />
          {details.businessName && <InfoField label="Negocio" value={details.businessName} />}
        </dl>
      </section>

      <div className="max-w-2xl mx-auto">
        <PasswordSection />
      </div>
    </div>
  );
}
