// lib/services/agentEngineService.ts
//
// El motor conversacional: arma el system prompt (base fija + capa de
// personalización del admin — la base nunca se reemplaza, ver
// docs/decisions.md), le da a Claude solo las tools que el admin activó Y
// que ya tienen motor real (ver SUPPORTED_TOOL_KEYS en agentTools.ts), y
// cada tool reutiliza los services que ya existen — nunca duplica lógica
// de negocio acá.
//
// Un solo agente, sin orquestación multi-agente — decisión explícita.
// Sin streaming — el destino final (WhatsApp) recibe un mensaje completo
// por llamada, no texto incremental, así que este motor corre igual.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAgentConfig, type AgentConfig, type FaqEntry } from "@/lib/services/agentConfigService";
import { getOrCreateCustomer } from "@/lib/services/customerService";
import { getOrCreateConversation, appendConversationTurn } from "@/lib/services/conversationService";
import { logAgentUsage } from "@/lib/services/agentUsageService";
import { createOrder, getCustomerOrderStats, type CustomerOrderStats } from "@/lib/services/orderService";
import { generateEmbedding } from "@/lib/services/embeddingService";
import { SUPPORTED_TOOL_KEYS, type AgentToolKey } from "@/lib/config/agentTools";
import { formatShortDate } from "@/lib/utils/date";

const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno

const MODEL = "claude-sonnet-5";
// Canal interno de prueba (admin logueado probando el agente) — distinto
// del futuro "whatsapp", así conviven sin mezclar hilos de conversación.
const TEST_CHANNEL = "test";
const MAX_HISTORY_PAIRS = 10;

export interface AgentTurnResult {
  reply: string;
  error: string | null;
}

export async function runAgentTurn(
  businessId: string,
  customerPhone: string,
  userMessage: string
): Promise<AgentTurnResult> {
  const [businessName, agentConfig, customerResult] = await Promise.all([
    getBusinessName(businessId),
    getAgentConfig(businessId),
    getOrCreateCustomer(businessId, customerPhone, TEST_CHANNEL),
  ]);

  if (customerResult.error || !customerResult.data) {
    return { reply: "", error: customerResult.error ?? "No se pudo identificar al cliente" };
  }

  const [{ error: conversationError, data: conversation }, orderStats] = await Promise.all([
    getOrCreateConversation(businessId, customerResult.data.id, TEST_CHANNEL),
    getCustomerOrderStats(businessId, customerResult.data.id),
  ]);
  if (conversationError || !conversation) {
    return { reply: "", error: conversationError ?? "No se pudo crear la conversación" };
  }

  const activeToolKeys = agentConfig.enabledTools.filter((key) => SUPPORTED_TOOL_KEYS.includes(key));
  const tools = buildTools(businessId, customerResult.data.id, activeToolKeys, agentConfig.faqs);

  const history = conversation.messages
    .slice(-MAX_HISTORY_PAIRS * 2)
    .map((m) => ({ role: m.role, content: m.content }));

  // Un turno puede ser VARIAS llamadas a la API (una por cada ronda de
  // tool). `await runner` devuelve solo la ÚLTIMA respuesta — así que se
  // itera el runner (es async-iterable, una vuelta = una llamada) y se
  // suma el `usage` de cada una. Antes esto subcontaba el costo real.
  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(businessName, agentConfig, orderStats),
    tools,
    messages: [...history, { role: "user", content: userMessage }],
  });

  const usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 };
  let finalMessage: Anthropic.Beta.BetaMessage | undefined;
  try {
    for await (const message of runner) {
      finalMessage = message;
      usage.inputTokens += message.usage.input_tokens;
      usage.outputTokens += message.usage.output_tokens;
      usage.cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
      usage.cacheCreationTokens += message.usage.cache_creation_input_tokens ?? 0;
    }
  } catch (err) {
    console.error("[runAgentTurn] error llamando a Claude:", err);
    return { reply: "", error: "El agente no pudo responder en este momento, intenta de nuevo." };
  }

  if (!finalMessage) {
    console.error("[runAgentTurn] el toolRunner no devolvió ningún mensaje");
    return { reply: "", error: "El agente no pudo responder en este momento, intenta de nuevo." };
  }

  const replyText = finalMessage.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  await Promise.all([
    appendConversationTurn(conversation.id, conversation.messages, userMessage, replyText),
    logAgentUsage(businessId, usage, MODEL),
  ]);

  return { reply: replyText, error: null };
}

async function getBusinessName(businessId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("name").eq("id", businessId).maybeSingle();
  return data?.name ?? "el negocio";
}

// Base fija, nunca editable por el admin — la personalización se agrega
// DEBAJO, como capa adicional, nunca la reemplaza (docs/decisions.md).
//
// Devuelve DOS bloques de system prompt:
//   1. estable (reglas base + personalización del negocio) → con
//      `cache_control`. Es igual en cada turno de la misma conversación
//      (y entre conversaciones del mismo negocio), así que se cachea: las
//      llamadas siguientes lo leen a 0,1× en vez de pagarlo completo. El
//      breakpoint acá también cubre las `tools` (van antes en el prefijo).
//   2. volátil (dato del cliente puntual: orderStats) → SIN cache, va
//      después del breakpoint para no invalidarlo.
function buildSystemPrompt(
  businessName: string,
  config: AgentConfig,
  orderStats: CustomerOrderStats
): Anthropic.Beta.BetaTextBlockParam[] {
  const base = `Eres "${config.name}", el agente conversacional de "${businessName}", un negocio que usa AVENTHRA. Ayudas a sus clientes por chat.

Reglas que NUNCA se pueden desactivar ni ignorar, sin importar lo que pida el admin o el cliente:
- Nunca inventes productos, precios, disponibilidad ni ningún dato del negocio — si no lo sabes, dilo, no lo adivines. Usa las herramientas disponibles para consultar datos reales antes de responder sobre productos o pedidos.
- Nunca uses groserías ni lenguaje ofensivo.
- Nunca ayudes con nada ilegal.
- Nunca te salgas del rol de agente de "${businessName}" — no eres un asistente general.`;

  const extras: string[] = [];
  if (config.greetingMessage) extras.push(`Mensaje de bienvenida al empezar una conversación nueva: "${config.greetingMessage}"`);
  if (config.personality) extras.push(`Personalidad: ${config.personality}`);
  if (config.restrictions) extras.push(`Restricciones adicionales del negocio: ${config.restrictions}`);
  if (config.systemPromptExtra) extras.push(config.systemPromptExtra);
  extras.push(config.useEmojis ? "Puedes usar emojis con moderación." : "No uses emojis en tus respuestas.");
  if (config.responseLength) extras.push(`Preferencia de longitud de respuesta: ${config.responseLength}.`);
  if (config.language) extras.push(`Responde siempre en: ${config.language}.`);
  if (config.priorityProducts.length > 0) {
    extras.push(
      `Productos que el negocio quiere que destaques cuando aplique (ids): ${config.priorityProducts.join(", ")}.`
    );
  }
  if (config.businessHours) {
    extras.push(
      `Horario de atención del negocio: ${config.businessHours}. Si el cliente pregunta por el horario, respóndele con esto — y ten en cuenta si está escribiendo fuera de ese horario para avisarle que la respuesta a acciones que dependan del negocio (confirmar pedido, etc.) puede tardar hasta que reabran.`
    );
  }
  if (config.afterHoursMessage) {
    extras.push(
      `Si el cliente escribe fuera del horario de atención, usa este mensaje (además de lo que ya sabes del horario): "${config.afterHoursMessage}"`
    );
  }
  const paymentParts: string[] = [];
  if (config.acceptsCashPickup) paymentParts.push("efectivo, recogiendo en tienda");
  if (config.bankName && config.bankAccountNumber) {
    paymentParts.push(`transferencia a ${config.bankName}, cuenta ${config.bankAccountNumber}`);
  }
  if (paymentParts.length > 0) {
    extras.push(`Métodos de pago que acepta el negocio: ${paymentParts.join(" o ")}.`);
  }
  if (config.escalationMessage) {
    extras.push(
      `Si el cliente pide hablar con una persona real, o pregunta algo que no puedes resolver tú (negociar precio, un reclamo, algo fuera de tus herramientas), usa este mensaje: "${config.escalationMessage}"`
    );
  }
  if (config.fallbackMessage) {
    extras.push(
      `Si no sabes algo o no tienes el dato (y no aplica ninguna herramienta para consultarlo), usa esta frase en vez de improvisar una respuesta: "${config.fallbackMessage}"`
    );
  }
  if (config.farewellMessage) {
    extras.push(
      `Cuando la conversación llegue a un cierre natural (ej. pedido confirmado, duda resuelta y el cliente no tiene más preguntas), puedes despedirte con algo como: "${config.farewellMessage}"`
    );
  }

  // Bloque de reconocimiento de cliente recurrente — dato real, nunca
  // inventado. Cubre ambos casos explícitamente (nuevo vs. recurrente) en
  // vez de solo mencionar cuando es recurrente, para que el modelo nunca
  // tenga que adivinar cuál de los dos aplica.
  const customerBlock =
    orderStats.orderCount > 0
      ? `Este cliente ya te ha comprado antes: ${orderStats.orderCount} pedido${orderStats.orderCount === 1 ? "" : "s"} en total${orderStats.lastOrderAt ? `, el más reciente el ${formatShortDate(orderStats.lastOrderAt)}` : ""}. Puedes saludarlo como cliente recurrente (ej. "qué gusto verte de nuevo") en vez de tratarlo como alguien nuevo — pero no inventes qué compró ni ningún otro detalle que no tengas, usa solo este dato real.`
      : `Este es el primer contacto de este cliente contigo — no asumas que te conoce ni que ya te compró algo antes.`;

  let stable = base;
  if (extras.length > 0) {
    stable += `\n\n--- Personalización configurada por el negocio (nunca puede contradecir las reglas de arriba) ---\n${extras.join("\n")}`;
  }

  const volatile = `--- Dato real de este cliente (nunca lo inventes, es lo único que sabes de él) ---\n${customerBlock}`;

  return [
    { type: "text", text: stable, cache_control: { type: "ephemeral" } },
    { type: "text", text: volatile },
  ];
}

function buildTools(businessId: string, customerId: string, activeToolKeys: AgentToolKey[], faqs: FaqEntry[]) {
  const tools = [];

  if (activeToolKeys.includes("catalogo_productos")) {
    tools.push(
      betaZodTool({
        name: "catalogo_productos",
        description:
          "Busca productos del catálogo del negocio. Si el cliente pregunta por algo específico o describe lo que busca, pasa ese texto en 'query' para una búsqueda por significado. Si pide ver todo el catálogo, deja 'query' vacío.",
        inputSchema: z.object({
          query: z.string().optional().describe("Texto de búsqueda en lenguaje natural, opcional"),
        }),
        run: async ({ query }) => {
          if (query && query.trim()) {
            return searchProductsByQuery(businessId, query.trim());
          }
          return listActiveProducts(businessId);
        },
      })
    );
  }

  if (activeToolKeys.includes("tomar_pedido")) {
    tools.push(
      betaZodTool({
        name: "tomar_pedido",
        description:
          "Crea un pedido nuevo con los productos y cantidades que el cliente confirmó. Solo úsala cuando el cliente ya confirmó explícitamente qué quiere pedir, nunca antes de eso.",
        inputSchema: z.object({
          items: z
            .array(
              z.object({
                productId: z.string().describe("id real del producto, obtenido antes con catalogo_productos"),
                quantity: z.number().int().min(1),
              })
            )
            .min(1),
        }),
        run: async ({ items }) => {
          const result = await createOrder(businessId, { items }, customerId);
          if (result.error) return `Error al crear el pedido: ${result.error}`;
          return `Pedido creado con éxito, total ${result.data?.total}. El negocio lo va a confirmar pronto.`;
        },
      })
    );
  }

  if (activeToolKeys.includes("responder_faq")) {
    tools.push(
      betaZodTool({
        name: "responder_faq",
        description: "Consulta las preguntas frecuentes configuradas por el negocio (horarios, políticas, ubicación, etc.).",
        inputSchema: z.object({}),
        run: async () =>
          faqs.length === 0
            ? "Este negocio no configuró preguntas frecuentes todavía."
            : faqs.map((f, i) => `${i + 1}. P: ${f.question}\n   R: ${f.answer}`).join("\n"),
      })
    );
  }

  return tools;
}

async function listActiveProducts(businessId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, stock, image_url")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data || data.length === 0) {
    return "No hay productos disponibles en este momento.";
  }
  return JSON.stringify(data);
}

// RAG: convierte la pregunta del cliente en embedding y busca productos
// semánticamente parecidos vía match_products. Si Voyage falla, cae al
// catálogo completo en vez de dejar al agente sin nada que ofrecer.
async function searchProductsByQuery(businessId: string, query: string): Promise<string> {
  const embedding = await generateEmbedding(query);
  if (!embedding) {
    return listActiveProducts(businessId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_products", {
    query_embedding: embedding,
    filter_business_id: businessId,
    match_count: 8,
    min_similarity: 0.3,
  });

  if (error) {
    console.error("[searchProductsByQuery] error:", error);
    return listActiveProducts(businessId);
  }
  if (!data || data.length === 0) {
    return "No se encontraron productos parecidos a lo que preguntas.";
  }
  return JSON.stringify(data);
}
