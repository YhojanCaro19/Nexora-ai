import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'superadmin' | 'admin' | 'colaborador';

export interface SessionProfile {
  userId: string;
  fullName: string;
  role: UserRole;
  businessId: string | null;
  permissions: string[];
  mustChangePassword: boolean;
}

export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const fallbackName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Usuario';

  const { data: platformAdmin } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (platformAdmin) {
    return {
      userId: user.id,
      fullName: fallbackName,
      role: 'superadmin',
      businessId: null,
      permissions: [],
      mustChangePassword: false,
    };
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('role, business_id, full_name, permissions, must_change_password')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (membership) {
    return {
      userId: user.id,
      fullName: membership.full_name ?? fallbackName,
      role: membership.role as UserRole,
      businessId: membership.business_id,
      permissions: (membership.permissions as string[]) ?? [],
      mustChangePassword: membership.must_change_password ?? false,
    };
  }

  return null;
});