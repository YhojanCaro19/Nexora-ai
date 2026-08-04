import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}

export async function getContactRequests() {
  // Solo se lee con el cliente admin — no hay policy de SELECT pública
  // para contact_requests a propósito.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contact_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getContactRequests] error:", error);
    return [];
  }
  return data;
}

function generateTempPassword(): string {
  // Contraseña temporal legible pero suficientemente fuerte para un solo uso.
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  let pwd = "";
  for (let i = 0; i < 8; i++) {
    pwd += letters[Math.floor(Math.random() * letters.length)];
  }
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];
  // Mezcla simple para no dejar el símbolo siempre al final.
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

export async function createAccountFromRequest(requestId: string) {
  const admin = createAdminClient();

  const { data: request, error: reqError } = await admin
    .from("contact_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqError || !request) {
    return { error: "Solicitud no encontrada", data: null };
  }

  const tempPassword = generateTempPassword();

  const { data: newUser, error: createError } =
    await admin.auth.admin.createUser({
      email: request.email,
      password: tempPassword,
      email_confirm: true, // el admin ya validó al cliente por fuera, no requiere reconfirmar correo
      user_metadata: {
        full_name: request.full_name,
        must_change_password: true,
      },
    });

  if (createError || !newUser.user) {
    return { error: createError?.message ?? "No se pudo crear el usuario", data: null };
  }

  await admin
    .from("contact_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  return {
    error: null,
    data: {
      email: request.email,
      tempPassword,
    },
  };
}