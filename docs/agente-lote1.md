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

## 0. Migración de base de datos  — **[x] corrida (2026-08-31)**

Ver el bloque SQL en la sección de abajo. Es **puramente aditiva**: columnas
nuevas + un backfill. **No toca RLS ni políticas** (las policies de fila ya
cubren las columnas nuevas). No borra ninguna columna.

- [x] Correr el SQL en el editor de Supabase
- [x] Verificar `plans` → 4 / 8 / 15 OK
- [ ] Verificar `agent_configs` (`select payment_methods, emoji_mode, address_form from agent_configs;`)
- [ ] Actualizar `docs/database.md` (tabla `agent_configs` y `plans`)

## 1. Config del agente — servicio  — **[x] hecho**
`lib/services/agentConfigService.ts` — `AgentConfig`/`UpdateAgentConfigInput` con
los 9 campos nuevos; `getAgentConfig`/`updateAgentConfig` leen/escriben las
columnas nuevas; ya no tocan `use_emojis`/`bank_*`/`accepts_cash_pickup`.
Validación vía funciones `sanitize*` en `lib/config/*` (mismo patrón que
`sanitizeToolKeys`, el proyecto no usa zod para el agente).

## 2. Catálogos en código  — **[x] hecho**
- [x] `lib/config/escalationTriggers.ts` — 6 disparadores + `sanitize` + frase de prompt
- [x] `lib/config/agentPersona.ts` — `EMOJI_MODES`, `ADDRESS_FORMS`,
      `PAYMENT_METHOD_KINDS` + `sanitize*` + frases de prompt

## 3. Panel "Mi Agente"  — **[x] hecho**
- [x] **Pagos**: lista repetible (kind + label + detalle), "+ Agregar método"
- [x] **Conocimiento del negocio**: descripción, dirección/sedes, redes
- [x] **Comportamiento**: emojis (select + campo si "personalizado"), trato
      (Auto/Tú/Usted), modismos, checklist de disparadores de escalamiento
- [x] `page.tsx`: `DEFAULT_AGENT_CONFIG` tipado como `AgentConfig` con los defaults

## 4. Motor del agente  — **[x] hecho**
`buildSystemPrompt`: descripción/sedes/redes, emojis por modo, trato tú/usted,
modismos, disparadores de escalamiento, métodos de pago desde el array. Todo
dentro del bloque estable con `cache_control`. + regla base nueva: sin markdown
(chat de WhatsApp) — commit aparte.

## 5. Límite de colaboradores  — **[x] hecho**
`collaboratorService.ts`: `getCollaboratorUsage()` + chequeo en
`createCollaborator` (cuenta activos, límite del plan vía `subscriptions`→`plans`,
default 4 sin plan). Panel: "N de M colaboradores" + botón "Límite alcanzado"
en el chooser. Bajada de plan no borra nada.

## 6. Docs  — **[ ] parcial**
- [ ] `docs/database.md` — columnas nuevas
- [ ] `docs/architecture.md` — campos nuevos del prompt
- [ ] `docs/decisions.md` — límite de colaboradores por plan

## 7. Pruebas  — **[ ] pendiente (las hace el usuario)**
- [x] `tsc` + `eslint` limpios
- [ ] Cargar 2+ métodos de pago → el agente los menciona todos
- [ ] emoji_mode = personalizado con `✂️ 💈` → el agente usa esos
- [ ] address_form = usted → el agente trata de usted
- [ ] disparador "reclamos" activo → el agente escala ante un reclamo
- [ ] Crear colaboradores hasta el límite → el N+1 se bloquea

---

## Fuera de este lote (anotado para no perderlo)
- **Clientes**: quitar Notas, Tareas y Etiquetas (el usuario dice que nadie las usa).
- **Reportes diarios**: que lleguen a TODOS los admins (hoy a uno). El 00:00 por
  país ya funciona.
- **Agente**: debounce de mensajes rápidos de la misma persona.
- **Lote 2**: preguntas obligatorias antes de un pedido, con defaults por industria.

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
