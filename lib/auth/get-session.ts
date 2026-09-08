import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'superadmin' | 'admin' | 'colaborador';

export interface SessionProfile {
  userId: string;
  fullName: string;
  role: UserRole;
  businessId: string | null;
  permissions: string[];
  /**
   * `false` solo para un negocio recién provisionado que todavía no pasó
   * por /bienvenida. Default `true` cuando no hay negocio (superadmin) para
   * no bloquear a nadie por error. El gate vive en admin/layout.tsx.
   */
  onboardingCompleted: boolean;
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
      onboardingCompleted: true,
    };
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('role, business_id, full_name, permissions, businesses(is_active, onboarding_completed)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (membership) {
    // Negocio inhabilitado por el superadmin (ej. falta de pago) bloquea a
    // TODOS sus miembros, admin y colaboradores por igual — no solo una
    // etiqueta visual en el panel de superadmin, un negocio inactivo no
    // puede entrar a la plataforma hasta que se vuelva a habilitar.
    const business = membership.businesses as unknown as
      | { is_active: boolean; onboarding_completed: boolean }
      | null;
    const businessActive = business?.is_active ?? true;
    if (!businessActive) return null;

    return {
      userId: user.id,
      fullName: membership.full_name ?? fallbackName,
      role: membership.role as UserRole,
      businessId: membership.business_id,
      permissions: (membership.permissions as string[]) ?? [],
      onboardingCompleted: business?.onboarding_completed ?? true,
    };
  }

  return null;
});