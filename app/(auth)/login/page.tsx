// app/(auth)/login/page.tsx
import Link from "next/link";
import { login, signInWithGoogle } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="px-6 md:px-12 w-full flex justify-start">
      <Card className="liquid-glass w-full max-w-sm rounded-2xl border-0 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        <CardHeader>
          <CardTitle className="text-white font-normal">Iniciar sesión</CardTitle>
          <CardDescription className="text-white/45">
            Entra a tu panel de NEXORA AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error && (
            <p className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-400">
              {params.error}
            </p>
          )}
          {params.message && (
            <p className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-sm text-emerald-400">
              {params.message}
            </p>
          )}

          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/60 text-xs tracking-wide">Correo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="tu@negocio.com"
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/60 text-xs tracking-wide">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-white/[0.03] border-white/10 text-white focus-visible:ring-[#4CC2E8]/40"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#4CC2E8] text-black hover:bg-[#4CC2E8]/90 font-medium"
            >
              Iniciar sesión
            </Button>
          </form>

          <form action={signInWithGoogle} className="mt-3">
            <Button
              type="submit"
              variant="outline"
              className="w-full bg-transparent border-white/15 text-white/80 hover:bg-white/5 hover:text-white"
            >
              Continuar con Google
            </Button>
          </form>

          <p className="mt-3 text-center text-sm">
            <Link href="/recuperar-password" className="underline text-white/35 hover:text-white/60 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-white/35">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/contacto" className="underline text-white/60 hover:text-white transition-colors">
              Contáctanos
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}