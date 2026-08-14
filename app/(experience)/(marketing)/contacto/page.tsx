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
import { FocusGlowCard } from "@/components/landing/FocusGlowCard";
import { PhoneField } from "@/components/shared/PhoneField";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="w-full flex items-center min-h-screen px-6 md:px-10 lg:px-16">
      <FocusGlowCard className="w-full max-w-xl ml-0 lg:ml-8 xl:ml-12 2xl:ml-16">
        <Card className="liquid-glass w-full rounded-2xl border-0 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-normal text-white">
              Hablemos sobre tu negocio
            </CardTitle>

            <CardDescription className="leading-relaxed text-white/45">
              Cuéntanos sobre tu negocio y te contactaremos para activar tu
              cuenta en <span className="text-white">AVENTHRA</span>.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {params.success ? (
              <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                ¡Gracias! Recibimos tu solicitud. Muy pronto nos pondremos en
                contacto contigo.
              </p>
            ) : (
              <form action={submitContactRequest} className="space-y-3">
                {params.error && (
                  <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    {params.error}
                  </p>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="full_name"
                    className="text-xs tracking-wide text-white/60 text-center"
                  >
                    Tu nombre
                  </Label>

                  <Input
                    id="full_name"
                    name="full_name"
                    required
                    className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="business_name"
                    className="text-xs tracking-wide text-white/60 text-center"
                  >
                    Nombre de tu negocio
                  </Label>

                  <Input
                    id="business_name"
                    name="business_name"
                    className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs tracking-wide text-white/60 text-center"
                  >
                    Correo
                  </Label>

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40"
                  />
                </div>

                <PhoneField />

                <div className="space-y-2">
                  <Label
                    htmlFor="message"
                    className="text-xs tracking-wide text-white/60 text-center"
                  >
                    Cuéntanos sobre tu negocio
                  </Label>

                  <Textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-[#4CC2E8] font-medium text-black hover:bg-[#4CC2E8]/90"
                >
                  Enviar solicitud
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </FocusGlowCard>
    </div>
  );
}