import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ASSIGNABLE_MODULES } from "@/lib/constants/nav-items";
import type { CollaboratorListItem } from "@/lib/services/collaboratorService";

const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  ASSIGNABLE_MODULES.map((m) => [m.key, m.label])
);

function ModulePills({ permissions }: { permissions: string[] }) {
  if (permissions.length === 0) {
    return <span style={{ color: 'var(--nexora-ink-dim)' }}>—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {permissions.map((key) => (
        <span
          key={key}
          className="text-[11px] font-medium px-2 py-0.5 rounded-md"
          style={{ color: 'var(--nexora-nova)', background: 'rgba(238,240,247,0.1)' }}
        >
          {MODULE_LABELS[key] ?? key}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const color = active ? 'var(--nexora-signal)' : 'var(--nexora-ink-dim)';
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium"
      style={{ color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

export function CollaboratorsTable({
  collaborators,
}: {
  collaborators: CollaboratorListItem[];
}) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Colaboradores</CardTitle>
        <CardDescription>
          {collaborators.length === 0
            ? "Todavía no has creado ningún colaborador."
            : `${collaborators.length} colaborador${collaborators.length === 1 ? "" : "es"} en tu negocio.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collaborators.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium" style={{ color: 'var(--nexora-ink)' }}>
                  {c.full_name ?? "—"}
                </TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{c.email}</TableCell>
                <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{c.phone ?? "—"}</TableCell>
                <TableCell>
                  <ModulePills permissions={c.permissions} />
                </TableCell>
                <TableCell>
                  <StatusBadge active={c.is_active} />
                </TableCell>
              </TableRow>
            ))}
            {collaborators.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                  No hay colaboradores todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
