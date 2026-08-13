"use client";

import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REQUIREMENTS = [
  { key: "length", label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
  { key: "upper", label: "Una mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lower", label: "Una minúscula", test: (v: string) => /[a-z]/.test(v) },
  { key: "number", label: "Un número", test: (v: string) => /[0-9]/.test(v) },
  { key: "special", label: "Un carácter especial", test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
];

// Compartido por cambiar-password y por el cambio de contraseña en Perfil
// — mismo input con ojito + checklist en vivo, para no tener dos copias.
export function isStrongPassword(value: string): boolean {
  return REQUIREMENTS.every((r) => r.test(value));
}

export function PasswordField({
  id = "password",
  name = "password",
  label = "Nueva contraseña",
  value,
  onChange,
  accentColor = "#4CC2E8",
}: {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  accentColor?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="block text-center text-white/60 text-xs tracking-wide">
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/[0.03] border-white/10 text-white pr-10"
          style={{ ["--tw-ring-color" as string]: accentColor }}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <ul className="mt-2 space-y-1.5 w-fit mx-auto">
        {REQUIREMENTS.map((r) => {
          const met = r.test(value);
          return (
            <li
              key={r.key}
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: met ? accentColor : "rgba(255,255,255,0.35)" }}
            >
              <span
                className="flex items-center justify-center w-4 h-4 rounded-full border shrink-0 transition-colors"
                style={{
                  borderColor: met ? accentColor : "rgba(255,255,255,0.25)",
                  background: met ? accentColor : "transparent",
                }}
              >
                {met && <Check size={10} strokeWidth={3} className="text-black" />}
              </span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
