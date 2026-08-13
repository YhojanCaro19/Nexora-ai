"use client";

import { useState } from "react";
import { changePasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { PasswordField, isStrongPassword } from "@/components/auth/PasswordField";

export function ChangePasswordForm({ error }: { error?: string }) {
  const [password, setPassword] = useState("");

  return (
    <>
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <form action={changePasswordAction} className="space-y-4">
        <PasswordField value={password} onChange={setPassword} />

        <Button
          type="submit"
          className="w-full bg-[#4CC2E8] text-black hover:bg-[#4CC2E8]/90 font-medium"
          disabled={!isStrongPassword(password)}
        >
          Guardar y continuar
        </Button>
      </form>
    </>
  );
}
