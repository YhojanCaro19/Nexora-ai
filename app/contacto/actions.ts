"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const contactSchema = z.object({
  full_name: z.string().min(2, "El nombre es muy corto"),
  business_name: z.string().optional(),
  email: z.string().email("Correo inválido"),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export async function submitContactRequest(formData: FormData) {
  const parsed = contactSchema.safeParse({
    full_name: formData.get("full_name"),
    business_name: formData.get("business_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    redirect(
      `/contacto?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }

  // Cliente normal (anon) — la policy RLS permite insert público a cualquiera,
  // pero nadie (excepto el backend admin) puede leer estos registros después.
  const supabase = await createClient();

  const { error } = await supabase.from("contact_requests").insert(parsed.data);

  if (error) {
    console.error("[submitContactRequest] error:", error);
    redirect(`/contacto?error=No pudimos enviar tu solicitud, intenta de nuevo`);
  }

  redirect("/contacto?success=true");
}