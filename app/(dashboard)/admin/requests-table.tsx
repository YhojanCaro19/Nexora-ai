"use client";

import { useState } from "react";
import { createAccountAction } from "./actions";
import { Button } from "@/components/ui/button";
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
    <div>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}

      {credentials && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-4">
          <p className="font-semibold text-green-800">
            Cuenta creada — copia estas credenciales ahora, no se volverán a mostrar:
          </p>
          <p className="mt-2 text-sm">
            Correo: <span className="font-mono">{credentials.email}</span>
          </p>
          <p className="text-sm">
            Contraseña temporal: <span className="font-mono">{credentials.tempPassword}</span>
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
              <TableCell>{r.full_name}</TableCell>
              <TableCell>{r.business_name ?? "—"}</TableCell>
              <TableCell>{r.email}</TableCell>
              <TableCell>{r.phone ?? "—"}</TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell>
                {r.status === "approved" ? (
                  <span className="text-sm text-muted-foreground">Cuenta creada</span>
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
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No hay solicitudes todavía.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}