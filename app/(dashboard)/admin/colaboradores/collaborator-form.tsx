"use client";

import { useState, type FormEvent } from "react";
import { createCollaboratorAction } from "./actions";
import { ASSIGNABLE_MODULES, type ModuleKey } from "@/lib/constants/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const EMPTY_FORM = { full_name: "", phone: "", email: "" };

export function CollaboratorForm({ onDone }: { onDone?: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [permissions, setPermissions] = useState<ModuleKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(
    null
  );

  function togglePermission(key: ModuleKey, checked: boolean) {
    setPermissions((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key)
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createCollaboratorAction({
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      permissions,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) {
      setCredentials(result.data);
      setForm(EMPTY_FORM);
      setPermissions([]);
    }
  }

  return (
    <div className="space-y-4">
      {credentials && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle style={{ color: 'var(--nexora-signal)' }}>Colaborador creado</CardTitle>
            <CardDescription>
              Copia estas credenciales ahora, no se volverán a mostrar:
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm" style={{ color: 'var(--nexora-ink)' }}>
              Correo: <span className="font-mono-data">{credentials.email}</span>
            </p>
            <p className="text-sm" style={{ color: 'var(--nexora-ink)' }}>
              Contraseña temporal: <span className="font-mono-data">{credentials.tempPassword}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setCredentials(null);
                onDone?.();
              }}
            >
              Listo
            </Button>
          </CardContent>
        </Card>
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
        <CardHeader className="text-center">
          <CardTitle>Nuevo colaborador</CardTitle>
          <CardDescription>
            Se creará una cuenta con contraseña temporal; el colaborador deberá cambiarla en su primer inicio de sesión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="block text-center">Nombre completo</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="block text-center">Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="block text-center">Correo</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="block text-center">Módulos que puede ver</Label>
              <div className="flex justify-center">
                <div className="flex flex-col items-start gap-2">
                  {ASSIGNABLE_MODULES.map((mod) => (
                    <Label key={mod.key} htmlFor={`perm-${mod.key}`} className="font-normal">
                      <Checkbox
                        id={`perm-${mod.key}`}
                        checked={permissions.includes(mod.key)}
                        onCheckedChange={(checked) => togglePermission(mod.key, checked === true)}
                      />
                      <mod.icon size={14} strokeWidth={1.75} style={{ color: 'var(--nexora-ink-dim)' }} />
                      {mod.label}
                    </Label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear colaborador"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
