"use client";

import { useState } from "react";
import { createAccountAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ContactRequest = {
  id: string;
  full_name: string;
  business_name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

export function RequestsTable({ requests }: { requests: ContactRequest[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(id: string) {
    setLoadingId(id);
    setError(null);
    const result = await createAccountAction(id);
    setLoadingId(null);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) {
      setCredentials(result.data);
    }
  }

  return (
    <div className="space-y-4">
      {credentials && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)' }}
        >
          <p className="text-[14px] font-medium" style={{ color: 'var(--nexora-signal)' }}>
            Cuenta creada — copia estas credenciales ahora, no se volverán a mostrar:
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--nexora-ink)' }}>
            Correo: <span className="font-mono-data">{credentials.email}</span>
          </p>
          <p className="text-sm" style={{ color: 'var(--nexora-ink)' }}>
            Contraseña temporal: <span className="font-mono-data">{credentials.tempPassword}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setCredentials(null)}
          >
            Cerrar
          </Button>
        </div>
      )}

      {error && (
        <p
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
        >
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes recibidas</CardTitle>
          <CardDescription>
            {requests.length === 0
              ? "No hay solicitudes todavía."
              : `${requests.length} solicitud${requests.length === 1 ? "" : "es"} recibidas.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Negocio</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium" style={{ color: 'var(--nexora-ink)' }}>
                    {r.full_name}
                  </TableCell>
                  <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{r.business_name ?? "—"}</TableCell>
                  <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{r.email}</TableCell>
                  <TableCell style={{ color: 'var(--nexora-ink-dim)' }}>{r.phone ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                      style={{ color: r.status === "approved" ? 'var(--nexora-signal)' : 'var(--nexora-nova)' }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: r.status === "approved" ? 'var(--nexora-signal)' : 'var(--nexora-nova)' }}
                      />
                      {r.status === "approved" ? "Aprobada" : "Nueva"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {r.status === "approved" ? (
                      <span className="text-sm" style={{ color: 'var(--nexora-ink-dim)' }}>Cuenta creada</span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={loadingId === r.id}
                        onClick={() => handleCreate(r.id)}
                      >
                        {loadingId === r.id ? "Creando..." : "Crear cuenta"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
                    No hay solicitudes todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
