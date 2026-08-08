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

export const COLABORADOR_NAV: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Inicio', href: '/colaborador', icon: LayoutDashboard },
      { label: 'Pedidos', href: '/colaborador/pedidos', icon: ShoppingBag },
      { label: 'Mi Perfil', href: '/colaborador/perfil', icon: UserCircle },
    ],
  },
];