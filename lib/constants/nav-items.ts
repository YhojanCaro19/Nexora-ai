import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Bot,
  Settings,
  Package,
  Users,
  FileBarChart,
  UserCircle,
  ShoppingBag,
} from 'lucide-react';

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const SUPERADMIN_NAV: NavGroup[] = [
  {
    label: 'Plataforma',
    items: [
      { label: 'Negocios', href: '/superadmin/negocios', icon: Building2 },
      { label: 'Solicitudes', href: '/superadmin/solicitudes', icon: ClipboardList },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Agentes', href: '/superadmin/agentes', icon: Bot },
      { label: 'Configuración', href: '/superadmin/configuracion', icon: Settings },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Principal',
    items: [{ label: 'Inicio', href: '/admin', icon: LayoutDashboard }],
  },
  {
    label: 'Operación',
    items: [
      { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingBag },
      { label: 'Catálogo', href: '/admin/catalogo', icon: Package },
      { label: 'Mi Agente', href: '/admin/mi-agente', icon: Bot },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { label: 'Colaboradores', href: '/admin/colaboradores', icon: Users },
      { label: 'Reportes', href: '/admin/reportes', icon: FileBarChart },
      { label: 'Perfil', href: '/admin/perfil', icon: UserCircle },
    ],
  },
];

/**
 * El menú del colaborador NO es una lista fija — antes lo era y mostraba
 * "Pedidos"/"Mi Perfil" a todos los colaboradores sin importar sus
 * `permissions` (y "Mi Perfil" ni siquiera tenía página construida, así
 * que era un link roto). Ahora se arma según los módulos que el admin le
 * asignó de verdad.
 *
 * "Mi Perfil" se quitó del todo por ahora — esa página no existe aún para
 * colaborador (queda pendiente, no confundir con que ya funciona).
 */
export function getColaboradorNav(permissions: string[]): NavGroup[] {
  const items: NavItem[] = [{ label: 'Inicio', href: '/colaborador', icon: LayoutDashboard }];

  if (permissions.includes('pedidos')) {
    items.push({ label: 'Pedidos', href: '/colaborador/pedidos', icon: ShoppingBag });
  }
  if (permissions.includes('catalogo')) {
    items.push({ label: 'Catálogo', href: '/colaborador/catalogo', icon: Package });
  }

  return [{ label: 'Principal', items }];
}

/**
 * Módulos que un admin puede asignar a un colaborador vía `business_members.permissions`
 * (ver docs/database.md y docs/architecture.md — "Regla de oro sobre permisos de colaborador").
 * `key` coincide con el segmento final del href del módulo en ADMIN_NAV, por la regla de
 * coding-standards.md de que las rutas coincidan con nav-items.ts.
 *
 * Se excluyen a propósito "Inicio" (siempre visible), "Mi Agente" (configura el agente de
 * todo el negocio, no es dato operativo del día a día) y "Colaboradores"/"Perfil" (gestión
 * exclusiva del admin / dato personal).
 *
 * "Reportes" también se excluye a propósito (decisión explícita, no descuido): expone datos
 * agregados de ventas/ingresos del negocio, un nivel de confianza distinto al operativo del
 * día a día de un colaborador. Además la página de Reportes para colaborador todavía no
 * existe. Si más adelante se construye Reportes de verdad y el negocio quiere delegarlo a
 * colaboradores de confianza, agregarlo aquí es una decisión aparte, no algo que se dé por
 * incluido solo porque ya existe la infraestructura de permisos.
 */
export const ASSIGNABLE_MODULES = [
  { key: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
  { key: 'catalogo', label: 'Catálogo', icon: Package },
] as const;

export type ModuleKey = (typeof ASSIGNABLE_MODULES)[number]['key'];