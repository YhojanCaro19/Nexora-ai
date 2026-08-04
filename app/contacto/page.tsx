// app/contacto/page.tsx
import { submitContactRequest } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="px-6 md:px-12 w-full flex justify-start">
      <Card className="liquid-glass w-full max-w-lg rounded-2xl border-0 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        <CardHeader>
          <CardTitle className="text-white font-normal">Hablemos sobre tu negocio</CardTitle>
          <CardDescription className="text-white/45">
            Cuéntanos sobre tu negocio y te contactamos para activar tu cuenta en NEXORA AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.success ? (
            <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
              ¡Gracias! Recibimos tu solicitud, te contactaremos pronto para activar tu cuenta.
            </p>
          ) : (
            <form action={submitContactRequest} className="space-y-4">
              {params.error && (
                <p className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-400">
                  {params.error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-white/60 text-xs tracking-wide">Tu nombre</Label>
                <Input id="full_name" name="full_name" required className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_name" className="text-white/60 text-xs tracking-wide">Nombre de tu negocio</Label>
                <Input id="business_name" name="business_name" className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/60 text-xs tracking-wide">Correo</Label>
                <Input id="email" name="email" type="email" required className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white/60 text-xs tracking-wide">Teléfono</Label>
                <Input id="phone" name="phone" className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-white/60 text-xs tracking-wide">Cuéntanos sobre tu negocio</Label>
                <Textarea id="message" name="message" rows={4} className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40" />
              </div>
              <Button type="submit" className="w-full bg-[#4CC2E8] text-black hover:bg-[#4CC2E8]/90 font-medium">
                Enviar solicitud
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}