"use client";

import { useState, type FormEvent } from "react";
import { createCollaboratorAction, updateCollaboratorAction } from "./actions";
import { ASSIGNABLE_MODULES, type ModuleKey } from "@/lib/constants/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneField } from "@/components/shared/PhoneField";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { CollaboratorListItem } from "@/lib/services/collaboratorService";

const EMPTY_FORM = { full_name: "", phone: "", email: "" };

// Mismo formulario sirve para crear y para editar — si le pasan
// `editingCollaborator`, cambia a modo edición y llama a onDone al terminar
// (mismo patrón que catalogo/product-form.tsx). El correo nunca se edita:
// está atado a la cuenta de Auth.
export function CollaboratorForm({
  editingCollaborator,
  onDone,
}: {
  editingCollaborator?: CollaboratorListItem | null;
  onDone?: () => void;
}) {
  const isEditing = !!editingCollaborator;
  const [form, setForm] = useState(
    editingCollaborator
      ? {
          full_name: editingCollaborator.full_name ?? "",
          phone: editingCollaborator.phone ?? "",
          email: editingCollaborator.email,
        }
      : EMPTY_FORM
  );
  // PhoneField no es controlado (solo lee su valor inicial al montar, ver
  // el mismo criterio ya documentado en perfil/identity-form.tsx) — para
  // que se vacíe de verdad tras crear un colaborador (setForm(EMPTY_FORM)
  // no le llega solo), se fuerza a remontar cambiando este key.
  const [phoneFieldKey, setPhoneFieldKey] = useState(0);
  const [permissions, setPermissions] = useState<ModuleKey[]>(
    (editingCollaborator?.permissions as ModuleKey[]) ?? []
  );
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

    if (isEditing) {
      const result = await updateCollaboratorAction(editingCollaborator.id, {
        full_name: form.full_name,
        phone: form.phone,
        permissions,
      });
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone?.();
      return;
    }

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
      setPhoneFieldKey((k) => k + 1);
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
          <CardTitle>{isEditing ? "Editar colaborador" : "Nuevo colaborador"}</CardTitle>
          {!isEditing && (
            <CardDescription>
              Se creará una cuenta con contraseña temporal; el colaborador deberá cambiarla en su primer inicio de sesión.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="space-y-1 md:space-y-1.5">
              <Label htmlFor="full_name" className="block text-center">Nombre completo</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>

            <PhoneField
              key={phoneFieldKey}
              label="Teléfono"
              defaultValue={editingCollaborator?.phone ?? undefined}
              onChange={(value) => setForm((f) => ({ ...f, phone: value }))}
            />

            {!isEditing && (
              <div className="space-y-1 md:space-y-1.5">
                <Label htmlFor="email" className="block text-center">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            )}

            <div className="space-y-1 md:space-y-1.5">
              <Label className="block text-center">Módulos que puede ver</Label>
              <div className="flex justify-center">
                <div className="flex flex-col items-start gap-1.5 md:gap-2">
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

            <div className="flex justify-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear colaborador"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={onDone}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
