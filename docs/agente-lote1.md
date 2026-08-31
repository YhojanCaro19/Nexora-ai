# Lote 1 — Personalización del agente + métodos de pago + límite de colaboradores

> Estado al **2026-08-31**. Marcá `[x]` a medida que se completa.
> Contexto y backlog completo: memoria `aventhra-agent-config-research`.
> El Lote 2 (preguntas obligatorias antes de un pedido, con defaults por
> industria) va aparte — no está en esta checklist.

## Decisiones tomadas
- Límite de colaboradores por plan: **Atención 4 · Crecimiento 8 · Escala 15**.
- Métodos de pago: **array, texto libre** (label + detalle), + efectivo. Reemplaza
  `bank_name` / `bank_account_number` / `accepts_cash_pickup` (las viejas se dejan
  en la base sin usar, como se hizo con `faq_text`).
- Personalización nueva: emojis a elegir, trato tú/usted, modismos, descripción
  del negocio, dirección/sedes, redes, disparadores de escalamiento.
- Preset de tono: **pospuesto** (media prioridad, no bloquea nada).

---

## 0. Migración de base de datos  — **[ ] pendiente (la corre el usuario en Supabase)**

Ver el bloque SQL en la sección de abajo. Es **puramente aditiva**: columnas
nuevas + un backfill. **No toca RLS ni políticas** (las policies de fila ya
cubren las columnas nuevas). No borra ninguna columna.

- [ ] Correr el SQL en el editor de Supabase
- [ ] Verificar: `select payment_methods, emoji_mode, address_form from agent_configs;`
- [ ] Verificar: `select key, max_collaborators from plans;`
- [ ] Actualizar `docs/database.md` (tabla `agent_configs` y `plans`)

## 1. Config del agente — servicio  — **[ ] pendiente**
`lib/services/agentConfigService.ts`
- [ ] `AgentConfig` + `UpdateAgentConfigInput`: agregar `paymentMethods`,
      `businessDescription`, `locations`, `socialLinks`, `emojiMode`, `emojiSet`,
      `addressForm`, `localPhrases`, `escalationTriggers`
- [ ] `getAgentConfig`: leer las columnas nuevas; dejar de leer `use_emojis`,
      `bank_name`, `bank_account_number`, `accepts_cash_pickup`
- [ ] `updateAgentConfig`: escribir las nuevas
- [ ] `lib/validators/` — schema zod: validar `emojiMode`/`addressForm` contra
      lista fija, `paymentMethods` como array de `{kind,label,detail}`,
      `escalationTriggers` contra `lib/config/escalationTriggers.ts`

## 2. Config del agente — nuevos catálogos en código  — **[ ] pendiente**
- [ ] `lib/config/escalationTriggers.ts` — lista fija (reclamos, devoluciones,
      precios especiales, cliente molesto, temas legales…) con key + label
- [ ] `lib/config/emojiModes.ts` / `addressForms.ts` — o constantes en el schema

## 3. Panel "Mi Agente"  — **[ ] pendiente**
`app/(dashboard)/admin/mi-agente/mi-agente-panel.tsx` + `page.tsx` (defaults)
- [ ] Sección **Pagos**: lista repetible de métodos (label + detalle + kind),
      "+ Agregar método" — mismo patrón que las FAQs
- [ ] Sección **Identidad** (o nueva "Sobre el negocio"): descripción del
      negocio, dirección/sedes, redes sociales
- [ ] Sección **Comportamiento**: emojis (Ninguno / Pocos / Estos que elijo +
      campo), trato (Auto / Tú / Usted), modismos
- [ ] Sección **Cierre y bordes**: checklist de disparadores de escalamiento
- [ ] `page.tsx`: agregar los defaults nuevos al objeto de config inicial

## 4. Motor del agente  — **[ ] pendiente**
`lib/services/agentEngineService.ts` → `buildSystemPrompt`
- [ ] Descripción del negocio → bloque de contexto
- [ ] Dirección/sedes + redes → en el bloque de datos del negocio
- [ ] Emojis: `emoji_mode` → "no uses emojis" / "usa pocos" / "usa preferentemente estos: X"
- [ ] Trato: `address_form` → "tutea al cliente" / "trata de usted" / (auto = nada)
- [ ] Modismos → "así habla este negocio: …"
- [ ] Disparadores de escalamiento → "SIEMPRE pasa a una persona si: …"
- [ ] Métodos de pago: recorrer el array `payment_methods` (reemplaza el bloque
      viejo de `bank_name`/`accepts_cash_pickup`)
- [ ] Todo lo estable sigue dentro del bloque con `cache_control`

## 5. Límite de colaboradores  — **[ ] pendiente**
- [ ] `lib/services/collaboratorService.ts` → `createCollaborator`: contar
      `business_members` activos con role `colaborador` del negocio, traer
      `plans.max_collaborators` vía `subscriptions.plan_id`, bloquear si se pasa
      con mensaje claro ("Llegaste al límite de tu plan (N). Mejorá tu plan
      para agregar más.")
- [ ] Sin plan asignado (fase pre-Wompi) → usar el límite del plan más bajo
      (Atención = 4) como default, no ilimitado
- [ ] `app/(dashboard)/admin/colaboradores/` — mostrar el mensaje de límite y,
      idealmente, "N de M colaboradores" en el encabezado
- [ ] Bajada de plan: NO borrar colaboradores, solo bloquear crear nuevos

## 6. Docs  — **[ ] pendiente**
- [ ] `docs/database.md` — columnas nuevas de `agent_configs` y `plans`
- [ ] `docs/architecture.md` — mención de los campos nuevos que alimentan el prompt
- [ ] `docs/decisions.md` — decisión de límite de colaboradores por plan

## 7. Pruebas  — **[ ] pendiente**
- [ ] Cargar 2+ métodos de pago → el agente los menciona todos
- [ ] emoji_mode = personalizado con `✂️ 💈` → el agente usa esos
- [ ] address_form = usted → el agente trata de usted
- [ ] disparador "reclamos" activo → el agente escala ante un reclamo
- [ ] Crear colaboradores hasta el límite → el N+1 se bloquea con el mensaje
- [ ] `tsc` + `eslint` limpios

---

## SQL de la migración (Lote 1)

```sql
-- ============================================================
-- AVENTHRA — Lote 1: personalización del agente + límite de
-- colaboradores. Aditivo. No toca RLS. No borra columnas.
-- Correr una vez en el SQL Editor de Supabase.
-- ============================================================

-- ---- agent_configs: columnas nuevas ------------------------
alter table public.agent_configs
  add column if not exists payment_methods      jsonb not null default '[]'::jsonb,
  add column if not exists business_description  text,
  add column if not exists locations            text,
  add column if not exists social_links         text,
  add column if not exists emoji_mode           text  not null default 'pocos',
  add column if not exists emoji_set             text,
  add column if not exists address_form         text  not null default 'auto',
  add column if not exists local_phrases         text,
  add column if not exists escalation_triggers  jsonb not null default '[]'::jsonb;

-- ---- Backfill: métodos de pago desde las columnas viejas ----
-- Solo toca filas que todavía están en el default '[]' (idempotente).
update public.agent_configs
set payment_methods =
      (case when accepts_cash_pickup
            then jsonb_build_array(
                   jsonb_build_object('kind','cash','label','Efectivo (recoger en tienda)'))
            else '[]'::jsonb end)
      ||
      (case when coalesce(bank_name,'') <> ''
            then jsonb_build_array(
                   jsonb_build_object('kind','transfer','label',bank_name,
                                      'detail',coalesce(bank_account_number,'')))
            else '[]'::jsonb end)
where payment_methods = '[]'::jsonb;

-- ---- Backfill: emoji_mode desde use_emojis -----------------
update public.agent_configs
set emoji_mode = case when use_emojis then 'pocos' else 'ninguno' end;

-- Nota: use_emojis, bank_name, bank_account_number y accepts_cash_pickup
-- se DEJAN en la tabla sin usar (mismo criterio que faq_text). El código
-- deja de leerlas.

-- ---- plans: límite de colaboradores -----------------------
alter table public.plans
  add column if not exists max_collaborators integer not null default 4;

update public.plans set max_collaborators = 4  where key = 'atencion';
update public.plans set max_collaborators = 8  where key = 'crecimiento';
update public.plans set max_collaborators = 15 where key = 'escala';

-- ---- Verificación (opcional) ------------------------------
-- select business_id, payment_methods, emoji_mode, address_form from public.agent_configs;
-- select key, name, max_collaborators from public.plans order by sort_order;
```

### Estructura de los campos jsonb

**`payment_methods`** — array de:
```json
{ "kind": "transfer" | "cash" | "other", "label": "Nequi", "detail": "3054072356" }
```
`detail` opcional (efectivo no lo necesita).

**`escalation_triggers`** — array de strings (keys de `lib/config/escalationTriggers.ts`):
```json
["reclamos", "devoluciones", "precios_especiales"]
```

**`emoji_mode`**: `'ninguno' | 'pocos' | 'personalizado'`
**`address_form`**: `'auto' | 'tu' | 'usted'`
