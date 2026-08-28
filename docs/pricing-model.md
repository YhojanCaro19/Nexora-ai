# Modelo de precios y créditos — AVENTHRA

> **Estado: ANÁLISIS + PROPUESTA v2 (2026-08-28).** Números para calibrar
> mañana en persona, no finales. La arquitectura de software (tablas, RLS,
> Wompi, enforcement) se diseña aparte.
>
> Regla de negocio del dueño: **siempre tirar a ganar.** Ningún plan debe
> quedar en riesgo de perder plata por un cálculo optimista. Los márgenes de
> abajo se calculan en el **peor caso (100% de los créditos quemados)**.

---

## 1. Decisiones ya tomadas

1. **Todo se paga con créditos** — agente conversacional y marketing con IA,
   un solo saldo por negocio.
2. **Créditos del plan vencen cada ciclo** (no se acumulan). Créditos de packs
   comprados aparte: por definir si vencen o no.
3. **Plan anual = pagar 10 meses, usar 12** (≈17% off).
4. El costo en créditos de cada acción sale del **precio real por millón de
   tokens** (Claude Console) más un margen fijo.
5. **Provisión sin superadmin.** El admin compra plan/packs por Wompi → webhook
   acredita automático. El superadmin solo ajusta a mano para soporte.

---

## 2. Nuestros costos reales (investigado 2026-08-28)

### 2.1 LLM — Claude (lo que ya usa el agente)

`agentEngineService.ts` corre hoy sobre **`claude-sonnet-5`**, `max_tokens: 1024`,
sin prompt caching, historial limitado a 10 pares de mensajes.

| Modelo | Input $/1M | Output $/1M |
|---|---|---|
| **Sonnet 5** (actual) | 2,00 | 10,00 |
| Haiku 4.5 (candidato para bajar costo) | 1,00 | 5,00 |
| Opus 5 (candidato para estrategia premium) | 5,00 | 25,00 |

- **Prompt caching:** escritura 1,25× (TTL 5 min) o 2× (1 h); **lectura 0,1×**
  (90% de descuento). Hoy **no está implementado** — es la palanca #1.
  ([docs Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-caching))
- **Batch API:** 50% de descuento, para trabajo no urgente (generar copy de
  campañas en lote).

Fuente de tarifas: skill `claude-api` (Console, cache 2026-06-24).

### 2.2 Generación de imágenes (aún sin proveedor elegido)

| Nivel | Modelos de referencia | Costo/imagen |
|---|---|---|
| Barato | FLUX schnell (fal/Replicate) ~$0,003 · gpt-image-1-mini ~$0,005 · Gemini 2.5 Flash Image *batch* ~$0,020 | **$0,003–0,02** |
| Estándar | Gemini 2.5 Flash Image ~$0,039 · Imagen 4 Standard ~$0,04 · gpt-image-1.5 ~$0,04 | **~$0,04** |
| HD / Ultra | Imagen 4 Ultra ~$0,06 · FLUX 2 Pro ~$0,055 · gpt-image-1 *high* ~$0,19 | **$0,06–0,19** |

Batch (OpenAI/Google) baja ~50%.
Fuentes: [digitalapplied](https://www.digitalapplied.com/blog/ai-image-generation-api-pricing-comparison-2026),
[pricepertoken](https://pricepertoken.com/image),
[OpenAI](https://openai.com/index/image-generation-api/).

### 2.3 WhatsApp Business Platform (modelo per-mensaje desde jul-2025)

Tarifas Colombia, por mensaje de plantilla **entregado**
([Ominiflow / rate card Meta](https://ominiflow.com/whatsapp-api-pricing/colombia),
[Blueticks](https://blueticks.co/blog/whatsapp-business-pricing-change-2026-per-message)):

| Categoría | Colombia | Cuándo aplica en AVENTHRA |
|---|---|---|
| **Servicio** (cliente escribe primero, respondemos dentro de 24 h) | **GRATIS** (+ 1.000 conversaciones de servicio gratis/mes) | **El grueso del agente: atender mensajes entrantes** |
| Marketing (plantilla, saliente, opt-in) | ~$0,0125 | Campañas proactivas / re-engagement |
| Utility (confirmaciones, estado de pedido) | ~$0,003 | Notificaciones de pedido |
| Authentication (OTP) | ~$0,006 | Login / verificación |

> **Clave:** atender a un cliente que escribió primero **no cuesta nada de
> WhatsApp**. El costo del agente es casi 100% tokens de Claude. Solo las
> campañas salientes (marketing) tienen costo de WhatsApp real.

**Decisión de infraestructura:** conectarse **directo a Meta Cloud API**, no
vía un BSP (Twilio, 360dialog) — el BSP mete markup de $0,003–0,01/mensaje.

### 2.4 Infra fija (se reparte entre todos los negocios)

| Servicio | ~Costo/mes |
|---|---|
| Supabase Pro | $25 + uso |
| Vercel Pro | $20 + uso |
| Resend (correo) | $20 |
| Embeddings RAG (Voyage/OpenAI) | centavos — despreciable |
| **Total base** | **~$65–150/mes** |

A 30+ negocios pagando esto es <5% del ingreso. Importa solo si hay <15
clientes.

---

## 3. Cuánto cuesta una conversación del agente

Estructura real por turno (de `agentEngineService.ts`):

| Componente | Tokens aprox. | Notas |
|---|---|---|
| System prompt (reglas base + bloque cliente + personalización) | 500–900 | crece según cuánto configure el admin |
| Esquemas de las 3 tools | 400–500 | `catalogo_productos`, `tomar_pedido`, `responder_faq` |
| Historial (tope 10 pares) | 400–1.600 | **acotado** — no crece infinito |
| Mensaje del cliente | 30–50 | |
| Salida (respuesta de WhatsApp) | 100–250 | `max_tokens` 1024 pero las respuestas son cortas |
| **Resultado de tool** (cuando busca catálogo) | 600–2.500 | RAG devuelve 8 productos; catálogo completo hasta 30 filas JSON |

**Costo por turno, Sonnet 5, SIN caching (estado actual):**

| Tipo de turno | Costo |
|---|---|
| Simple (sin tool) | ~$0,0055 |
| Con búsqueda de catálogo (RAG, 2 llamadas + resultado) | ~$0,012 |
| Con volcado de catálogo completo | ~$0,018 |

**Conversación de 10 mensajes** (5 turnos del agente, ~2 con tool):
→ **~$0,04–0,05**

**Conversación de 20 mensajes** (el historial satura el tope, no explota):
→ **~$0,06–0,09**

**Con prompt caching implementado** (palanca #1): **−30 a −40%**
→ conversación de 10 msg baja a **~$0,025–0,035**.

### Costo mensual del agente por perfil de negocio

| Perfil | Conversaciones/mes | Costo LLM/mes (sin caching) | Con caching |
|---|---|---|---|
| Chico | 200 | ~$9 | ~$6 |
| Mediano | 800 | ~$36 | ~$24 |
| Grande | 2.500 | ~$125 | ~$85 |

WhatsApp: **$0** en todos (conversaciones de servicio, entrantes).

---

## 4. Cuánto cuesta una campaña de marketing

| Pieza | Modelo | Costo |
|---|---|---|
| Estrategia | Sonnet 5, ~2k in + 1,5k out | ~$0,02 |
| 5 variaciones de copy | Haiku 4.5 (o batch −50%) | ~$0,014 |
| 3 imágenes estándar | Gemini Flash / Imagen 4 Std | ~$0,12 |
| 3 imágenes HD | Imagen Ultra / FLUX 2 Pro | ~$0,20 |
| Publicar / orquestar | infra | ~$0,002 |
| **Campaña con imágenes estándar** | | **~$0,15** |
| **Campaña con imágenes HD** | | **~$0,25** |

Envío por WhatsApp aparte: $0,0125 × Nº de mensajes marketing (Colombia).
Las imágenes dominan el costo → el proveedor de imágenes que elijamos es la
decisión más sensible del marketing.

---

## 5. Costo en créditos por acción (propuesta)

**1 crédito = US$0,01.** Objetivo: cobrar cada acción a **4–6× el costo real.**

| Acción | Costo real | **Créditos** | Retail | Markup |
|---|---|---|---|---|
| Agente: 1 respuesta | ~$0,008 | **3** | $0,03 | ~4× |
| Generar copy (1 pieza) | ~$0,003 | **2** | $0,02 | ~7× |
| Generar estrategia | ~$0,02 | **8** | $0,08 | ~4× |
| Generar imagen estándar | ~$0,04 | **10** | $0,10 | ~2,5× ⚠️ |
| Generar imagen HD | ~$0,06–0,19 | **25** | $0,25 | 1,3–4× ⚠️ |
| Publicar / lanzar campaña | ~$0,002 | **5** | $0,05 | — |
| Enviar 1 mensaje marketing WhatsApp | ~$0,0125 | **3** | $0,03 | ~2,4× |

⚠️ **Imágenes:** el markup depende 100% del proveedor. Con gpt-image-1 *high*
($0,19) perdemos plata a 25 créditos. Con Gemini Flash batch ($0,02) el markup
es 5×. **Hay que fijar proveedor barato/estándar y solo cobrar HD real como
premium.**

---

## 6. Planes — propuesta v2 (peor caso = ganamos)

| | **Atención** | **Crecimiento** ★ | **Escala** |
|---|---|---|---|
| Para quién | Negocio chico, solo agente | Negocio que quiere vender más | Varios negocios / agencia chica |
| **Mensual** | **US$39** | **US$99** | **US$249** |
| **Anual** (×10 meses) | US$390 | US$990 | US$2.490 |
| Créditos incluidos/mes | 3.000 | 9.000 | 25.000 |
| Valor retail de esos créditos | $30 | $90 | $250 |
| ≈ Respuestas de agente | ~1.000 | ~3.000 | ~8.300 |
| ≈ Conversaciones (~10 msg) | ~200 | ~600 | ~1.650 |
| Negocios vinculados | 1 | 1 | 3 |
| Campañas/mes (guía) | 5 | 20 | 60 |
| Imágenes | estándar | estándar + HD | estándar + HD |
| Cola de IA | normal | normal | prioritaria |

Créditos del plan se renuevan cada ciclo; **lo no usado se pierde.**

### Chequeo de margen (peor caso, 100% de créditos quemados)

| Plan | Ingreso | Costo real IA (créditos ÷ ~4) | Margen bruto |
|---|---|---|---|
| Atención $39 | $39 | ~$7,50 | **~81%** |
| Crecimiento $99 | $99 | ~$22,50 | **~77%** |
| Escala $249 | $249 | ~$62 | **~75%** |

Utilización real esperada 50–70% → márgenes de 85–90%. Resta la infra fija
(~$3–8/cliente a 30+ clientes). **Ningún plan pierde plata ni quemado al 100%.**

> Nota: el $29 que se había propuesto para Atención **sí era muy barato** —
> cubría ~$18 de costo LLM de un negocio activo dejando <40% de margen. $39 con
> 3.000 créditos (tope real de uso) lo corrige.

---

## 7. Packs extra (top-ups)

Se compran cuando se acaban los créditos del plan.

| Pack | Precio | $/crédito | vs. Crecimiento |
|---|---|---|---|
| 3.000 créditos | $29 | $0,0097 | +37% más caro |
| 10.000 créditos | $89 | $0,0089 | +26% |
| 30.000 créditos | $229 | $0,0076 | +8% |

Los packs cuestan **más por crédito** que el plan a propósito: el plan siempre
es el mejor negocio, el pack es solo colchón para picos.
Por definir: ¿vencen a los 12 meses o nunca?

---

## 8. Palancas para no perder plata

| # | Palanca | Impacto | Estado |
|---|---|---|---|
| 1 | **Prompt caching en `agentEngineService`** — separar base fija + tools (cacheable) de la personalización dinámica | −30–40% costo del agente | ❌ no implementado |
| 2 | **Haiku 4.5 para el agente** (o ruteo Haiku FAQ / Sonnet pedidos) | hasta −50% | por probar calidad |
| 3 | **Recortar resultado de tools** — `listActiveProducts` vuelca 30 filas JSON con `image_url` y `description` completa; bajar a ~15 filas y campos mínimos | −costo en turnos con catálogo | fácil |
| 4 | **Batch API** para copy de campañas (no urgente) | −50% en copy | fácil |
| 5 | **Proveedor de imágenes barato** (Gemini Flash batch / FLUX schnell) en vez de gpt-image-1 | evita markup negativo | decisión pendiente |
| 6 | **`agent_usage_log` casi seguro subcuenta** — `runAgentTurn` loguea `finalMessage.usage` (una sola vez por turno). Ese `usage` es el de la **última** respuesta del `toolRunner`, no la suma de las iteraciones: en turnos con tool no cuenta la llamada que decidió la tool ni los tokens del resultado reinyectado. Calibrar precios sobre estos datos crudos = **underpricing** | crítico para no mal-tarifar | ❌ confirmar en el SDK y corregir el logging |
| 7 | Historial acotado (`MAX_HISTORY_PAIRS = 10`) y `max_tokens: 1024` | ya limitan el gasto | ✅ ya está |
| 8 | Vencimiento mensual de créditos del plan | evita pasivo acumulado | ✅ decidido |
| 9 | WhatsApp directo por Meta Cloud API, sin BSP | evita $0,003–0,01/msg de markup | decisión pendiente |

---

## 9. Decisiones pendientes para mañana

- [ ] **Verificar `agent_usage_log`**: ¿captura todas las iteraciones del `toolRunner` o solo la última llamada? (palanca #6 — afecta todo el cálculo).
- [ ] Sacar el **promedio real de tokens/turno** de `agent_usage_log` (ya tiene datos desde el día uno) y contrastar con las estimaciones de la sección 3.
- [ ] **Proveedor de generación de imágenes** + mapeo a nivel estándar/HD.
- [ ] **Sonnet 5 vs Haiku 4.5** para el agente — prueba de calidad sobre conversaciones reales.
- [ ] ¿Estrategia con Sonnet 5 o Opus 5?
- [ ] **Moneda de cobro en Wompi**: Wompi es Colombia → ¿cobramos en COP con precio de referencia USD? Los costos de IA son en USD → el ingreso en COP necesita un **colchón de 10–15%** por riesgo cambiario.
- [ ] Confirmar precios de planes y créditos incluidos (tabla sección 6 es v2, no final).
- [ ] ¿Packs vencen a 12 meses o nunca?
- [ ] ¿Revisitar el híbrido? — dar a cada plan un cupo de "X conversaciones incluidas" y cobrar créditos solo por encima de ese cupo. Ventaja: el cliente no ve su saldo bajar "solo por conversar". Se descartó por "todo con créditos", pero vale reconsiderarlo para la parte del agente.

---

## 10. Qué hace la competencia (referencia)

**AdCreative.ai** ([TrustRadius](https://www.trustradius.com/products/adcreative-ai/pricing),
[Capterra](https://www.capterra.com/p/253052/AdCreativeai/pricing/)):
$29/mes = 10 créditos · $99/mes = 50 · $149/mes = 100. Anual −40%. Créditos
**no se acumulan**. 1 crédito ≈ 1 creativo básico; copy premium 2–3 créditos.
Su "crédito" es un entregable completo (~$2–3), no una unidad fina como la
nuestra. No cobran el chat — solo generación de creativos.

Nuestro modelo (crédito fino, unifica agente + marketing) es más flexible pero
obliga a vigilar que el agente no dispare el consumo — de ahí las palancas de
la sección 8.
