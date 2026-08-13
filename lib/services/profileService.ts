import { createClient } from "@/lib/supabase/server";

export interface ProfileDetails {
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  businessName: string | null;
}

export async function getProfileDetails(
  userId: string,
  businessId: string | null,
  role: string,
  fallbackFullName: string
): Promise<ProfileDetails> {
  const supabase = await createClient();

  const [{ data: auth }, memberResult, businessResult] = await Promise.all([
    supabase.auth.getUser(),
    businessId
      ? supabase.from("business_members").select("full_name, phone").eq("user_id", userId).eq("business_id", businessId).maybeSingle()
      : Promise.resolve({ data: null }),
    businessId
      ? supabase.from("businesses").select("name").eq("id", businessId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    fullName: memberResult.data?.full_name ?? fallbackFullName,
    email: auth.user?.email ?? null,
    phone: memberResult.data?.phone ?? null,
    role,
    businessName: businessResult.data?.name ?? null,
  };
}
