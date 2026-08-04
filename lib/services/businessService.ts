import { createClient, createAdminClient } from "@/lib/supabase/server";
import { businessSchema, type BusinessInput } from "@/lib/validators/businessSchema";

export async function createBusiness(input: BusinessInput) {
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  // 1. Autenticación validada con el cliente normal (respeta la sesión del usuario).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No hay sesión activa", data: null };
  }

  // 2. La escritura de bootstrapping (crear el primer negocio) se hace con el
  //    cliente admin, fijando owner_id con el user.id ya validado en el servidor.
  //    Esto es intencional: en este punto el usuario aún no es miembro de ningún
  //    negocio, así que no hay una política RLS "normal" que pueda evaluar todavía.
  //    owner_id nunca proviene del cliente/formulario, solo de la sesión verificada.
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("businesses")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      industry_type: parsed.data.industry_type,
    })
    .select()
    .single();

  if (error) {
    console.error("[createBusiness] error:", error);
    return { error: error.message, data: null };
  }

  // El trigger on_business_created ya agrega al owner como miembro.
  await admin.from("agent_configs").insert({
    business_id: data.id,
    enabled_tools: [],
  });

  return { error: null, data };
}

export async function getUserBusinesses() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Esta sí es una lectura normal — el usuario ya es miembro, RLS funciona como se diseñó.
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id);

  return data ?? [];
}