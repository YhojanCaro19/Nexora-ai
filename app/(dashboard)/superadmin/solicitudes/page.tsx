// app/(dashboard)/superadmin/solicitudes/page.tsx
import { createClient } from "@/lib/supabase/server";
import { getPhoneBusinessMatches } from "@/lib/services/adminService";
import { RequestsTable } from "./requests-table";

export default async function SolicitudesPage() {
  const supabase = await createClient();

  const { data: requests, error } = await supabase
    .from("contact_requests")
    .select("id, full_name, business_name, email, phone, message, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[SolicitudesPage] error al leer contact_requests:", error);
  }

  // Solo hace falta el aviso para las solicitudes todavía pendientes — las
  // aprobadas ya generaron su propio negocio, no hay nada que decidir ahí.
  const pendingPhones = (requests ?? [])
    .filter((r) => r.status === "new")
    .map((r) => r.phone);
  const phoneMatches = await getPhoneBusinessMatches(pendingPhones);

  return (
    <div className="space-y-6">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Solicitudes
      </h1>
      <RequestsTable requests={requests ?? []} phoneMatches={phoneMatches} />
    </div>
  );
}