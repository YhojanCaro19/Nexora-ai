// app/contacto/page.tsx

import { submitContactRequest } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FocusGlowCard } from "@/components/landing/FocusGlowCard";
import { PhoneField } from "@/components/shared/PhoneField";
import { industryTypes } from "@/lib/validators/businessSchema";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <div
      // Vuelto a items-center (pedido explícito: "la idea es que quede
      // centrado") — la corrección anterior (items-start) partía de un
      // diagnóstico equivocado: con items-center + padding explícito, un
      // flex container de una sola columna SIEMPRE respeta como mínimo el
      // padding-top/bottom sin importar si el contenido es más alto que el
      // viewport — cuando el contenido + padding excede min-h-screen, el
      // contenedor crece exactamente a esa altura y el centrado dentro de
      // esa área ya no tiene slack de sobra, así que el hijo queda pegado
      // a los bordes del padding, ni un pixel menos. El problema real no
      // era el centrado, era que pt-20 (80px, solo pensado para la barra
      // delgada del navbar) se quedaba corto: el wordmark 3D persistente
      // (MobileWordmarkScene, montado en Experience.tsx en TODA página)
      // ocupa más alto en pantalla que esa barra — con pt-20 la card
      // arrancaba pegada arriba y tapaba el wordmark (visto en captura
      // real). pt-40 le da margen real de sobra debajo del wordmark.
      //
      // pb-[6.5rem+safe-area] cubre la altura real de la barra inferior
      // fija de Navbar.tsx (3 botones) — mismo criterio que ya usa el
      // propio Navbar.tsx en su pb-[max(1rem,env(safe-area-inset-bottom))].
      className="w-full flex items-center min-h-screen px-6 md:px-10 lg:px-16 pt-40 lg:pt-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0"
    >
      <FocusGlowCard className="w-full max-w-xl ml-0 lg:ml-8 xl:ml-12 2xl:ml-16">
        {/* Mismo mecanismo de card.tsx (data-[size=sm]) para el padding
            interno solo en mobile, sin tocar el primitivo. spacing(2) se
            sentía "pegado" al borde → spacing(3) (spacing(3.5) se probó y
            se revirtió, spacing(3) fue el que se quedó). md+ sigue en
            spacing(4), sin cambios ahí. */}
        <Card className="liquid-glass w-full rounded-2xl border-0 shadow-[0_8px_40px_rgba(0,0,0,0.4)] [--card-spacing:--spacing(3)] md:[--card-spacing:--spacing(4)]">
          <CardHeader className="text-center">
            <CardTitle className="text-lg md:text-2xl font-normal text-white">
              Hablemos sobre tu negocio
            </CardTitle>
          </CardHeader>

          <CardContent>
            {params.success ? (
              <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                ¡Gracias! Recibimos tu solicitud. Muy pronto nos pondremos en
                contacto contigo.
              </p>
            ) : (
              <form action={submitContactRequest} className="space-y-1.5 md:space-y-3">
                {params.error && (
                  <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    {params.error}
                  </p>
                )}

                <div className="space-y-0.5 md:space-y-2">
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

                <div className="space-y-0.5 md:space-y-2">
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

                <div className="space-y-0.5 md:space-y-2">
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

                <div className="space-y-0.5 md:space-y-2">
                  <Label
                    htmlFor="industry_type"
                    className="text-xs tracking-wide text-white/60 text-center"
                  >
                    Tipo de negocio
                  </Label>

                  {/* <select> nativo a propósito (no el Select del design
                      system) — este formulario envía por FormData vía
                      action={submitContactRequest}, un <select> nativo
                      llega solo con `name`, sin cablear un input oculto
                      aparte para que el componente controlado lo refleje. */}
                  <select
                    id="industry_type"
                    name="industry_type"
                    defaultValue=""
                    className="h-10 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white focus-visible:ring-2 focus-visible:ring-[#4CC2E8]/40 focus-visible:outline-none"
                  >
                    <option value="" disabled className="bg-black">
                      Selecciona el tipo de negocio
                    </option>
                    {industryTypes.map((it) => (
                      <option key={it.value} value={it.value} className="bg-black">
                        {it.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-0.5 md:space-y-2">
                  <Label
                    htmlFor="message"
                    className="text-xs tracking-wide text-white/60 text-center"
                  >
                    Cuéntanos sobre tu negocio
                  </Label>

                  <Textarea
                    id="message"
                    name="message"
                    rows={3}
                    className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-10 md:h-11 w-full bg-[#4CC2E8] font-medium text-black hover:bg-[#4CC2E8]/90"
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