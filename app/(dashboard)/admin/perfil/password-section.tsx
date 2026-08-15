"use client";

import { useState } from "react";
import { requestPasswordOtpAction, verifyPasswordOtpAction, updateOwnPasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PasswordField, isStrongPassword } from "@/components/auth/PasswordField";
import { OTP_CODE_LENGTH } from "@/lib/constants/otp";

type Step = "idle" | "otp-sent" | "verified" | "done";

export function PasswordSection() {
  const [step, setStep] = useState<Step>("idle");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestCode() {
    setLoading(true);
    setError(null);
    const result = await requestPasswordOtpAction();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("otp-sent");
  }

  async function handleVerifyCode() {
    setLoading(true);
    setError(null);
    const result = await verifyPasswordOtpAction(code);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("verified");
  }

  async function handleUpdatePassword() {
    setLoading(true);
    setError(null);
    const result = await updateOwnPasswordAction(password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("done");
    setPassword("");
    setCode("");
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Contraseña</CardTitle>
        <CardDescription>
          Por seguridad, cambiar tu contraseña requiere confirmar un código que se envía a tu correo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex flex-col items-center text-center">
        {error && (
          <p
            className="rounded-lg border p-3 text-sm w-full max-w-xs"
            style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
          >
            {error}
          </p>
        )}

        {step === "idle" && (
          <Button disabled={loading} onClick={handleRequestCode}>
            {loading ? "Enviando..." : "Cambiar contraseña"}
          </Button>
        )}

        {step === "otp-sent" && (
          <div className="space-y-3 w-full max-w-xs">
            <div className="space-y-1.5">
              <Label htmlFor="otp" className="block text-center">Código de verificación</Label>
              <Input
                id="otp"
                inputMode="numeric"
                maxLength={OTP_CODE_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_CODE_LENGTH))}
                placeholder="00000000"
                className="text-center"
              />
              <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                Te lo enviamos por correo. Puede tardar un minuto.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button disabled={loading || code.length !== OTP_CODE_LENGTH} onClick={handleVerifyCode}>
                {loading ? "Verificando..." : "Verificar código"}
              </Button>
              <Button variant="outline" disabled={loading} onClick={handleRequestCode}>
                Reenviar código
              </Button>
            </div>
          </div>
        )}

        {step === "verified" && (
          <div className="space-y-4 w-full max-w-xs">
            <PasswordField
              label="Contraseña nueva"
              value={password}
              onChange={setPassword}
              accentColor="var(--nexora-signal)"
            />
            <div className="flex justify-center">
              <Button disabled={loading || !isStrongPassword(password)} onClick={handleUpdatePassword}>
                {loading ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <p className="text-sm" style={{ color: 'var(--nexora-signal)' }}>
            Contraseña actualizada correctamente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
