# Estándares de código — AVENTHRA

## Stack
Next.js (App Router) + TypeScript estricto, Tailwind, shadcn/ui, Supabase (Postgres + Auth), Zod para validación.

## Reglas
- Nunca `any`. Si el tipo es difícil de expresar, preguntar antes de forzarlo.
- Server actions (`"use server"`) para toda escritura — no exponer lógica de negocio en client components.
- Validación de formularios siempre con Zod antes de tocar la base de datos.
- Componentes de UI reutilizables van en `components/ui/` (shadcn) y `components/dashboard/shared/` (propios del proyecto: `StatCard`, `EmptyStateSection`, `DashboardShell`, `Sidebar`).
- Toda página nueva de un módulo sin implementar arranca como `EmptyStateSection` (ver `admin/pedidos/page.tsx` como referencia), nunca como página vacía o placeholder distinto.
- Nombres de carpeta de ruta deben coincidir exactamente con los `href` definidos en `lib/constants/nav-items.ts`.
- `revalidatePath` debe apuntar a la ruta real donde vive la página que muestra los datos afectados, no a una ruta antigua o supuesta.

## Antes de escribir SQL o políticas RLS
Correr una consulta de solo lectura primero para confirmar la estructura real de la tabla (columnas, constraints, políticas existentes) en vez de asumir — varias veces en este proyecto el nombre o default de una columna no coincidía con lo esperado.