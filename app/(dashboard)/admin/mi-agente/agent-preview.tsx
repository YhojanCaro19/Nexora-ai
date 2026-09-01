"use client";

// Vista previa "en vivo" del agente — un teléfono con una conversación de
// ejemplo que se re-arma en el navegador cada vez que cambia la config.
// NO llama a la API (cero costo, instantáneo). Es una APROXIMACIÓN: aplica
// reglas simples (saludo, emojis, tú/usted, longitud, métodos de pago) a
// unas frases de muestra. El agente de verdad se prueba en "Probar tu
// agente" más abajo — eso sí usa el modelo real.
import { Bot } from "lucide-react";
import type { PaymentMethod } from "@/lib/config/agentPersona";

export interface AgentPreviewConfig {
  name: string;
  greeting: string;
  emojiMode: string;
  emojiSet: string;
  addressForm: string;
  responseLength: string;
  localPhrases: string;
  paymentMethods: PaymentMethod[];
  businessName: string | null;
  /** Un producto real del catálogo para que el ejemplo se sienta propio. */
  sampleProduct: { name: string; price: number } | null;
}

function formatCOP(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CO")}`;
}

const DEFAULT_EMOJIS = ["👋", "✨", "🙌", "😊"];

function emojisFromSet(set: string): string[] {
  // Toma "grafemas" separados por espacio/coma; se queda con los que no son
  // letras/números (heurística simple para "esto parece un emoji").
  const tokens = set
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !/^[\p{L}\p{N}]+$/u.test(t));
  return tokens.length > 0 ? tokens : DEFAULT_EMOJIS;
}

// Agrega (o no) un emoji al final de una línea del agente según el modo.
function withEmoji(line: string, i: number, cfg: AgentPreviewConfig): string {
  if (cfg.emojiMode === "ninguno") return line;
  const pool = cfg.emojiMode === "personalizado" ? emojisFromSet(cfg.emojiSet) : DEFAULT_EMOJIS;
  if (cfg.emojiMode === "pocos" && i !== 0 && i !== 2) return line; // solo saludo y cierre
  return `${line} ${pool[i % pool.length]}`;
}

const usted = (cfg: AgentPreviewConfig) => cfg.addressForm === "usted";

const SAMPLE_PRODUCT_NAME = "el combo corte y barba";

function greetingLine(cfg: AgentPreviewConfig): string {
  if (cfg.greeting.trim()) return cfg.greeting.trim();
  const soy = `Soy ${cfg.name || "tu asistente"}${cfg.businessName ? `, de ${cfg.businessName}` : ""}`;
  return usted(cfg)
    ? `¡Hola, buenos días! Todo bien por acá, gracias. ${soy}. ¿En qué le puedo ayudar?`
    : `¡Hola, buenos días! Todo bien por acá, gracias. ${soy}. ¿En qué te ayudo?`;
}

function availabilityLine(cfg: AgentPreviewConfig): string {
  const price = cfg.sampleProduct ? formatCOP(cfg.sampleProduct.price) : null;

  if (!price) {
    return usted(cfg)
      ? "¡Claro que sí! Está disponible. Dígame cuál le interesa y le paso el precio."
      : "¡Claro que sí! Está disponible. Decime cuál te interesa y te paso el precio.";
  }
  if (cfg.responseLength === "corta") {
    return `¡Claro! Disponible. Cuesta ${price}.`;
  }
  if (cfg.responseLength === "larga") {
    return usted(cfg)
      ? `¡Claro que sí! Lo tenemos disponible en este momento. Cuesta ${price}. Si quiere, coordinamos para que pase o le doy más detalles.`
      : `¡Claro que sí! Lo tenemos disponible en este momento. Cuesta ${price}. Si querés, coordinamos para que pases o te doy más detalles.`;
  }
  return `¡Claro que sí! Está disponible. Cuesta ${price}.`;
}

function paymentLine(cfg: AgentPreviewConfig): string {
  const puede = usted(cfg) ? "Puede" : "Podés";
  const list = cfg.paymentMethods
    .filter((m) => m.label.trim())
    .map((m) => (m.detail.trim() ? `${m.label.trim()} (${m.detail.trim()})` : m.label.trim()));
  if (list.length === 0) return `${puede} coordinar el pago con nosotros directamente.`;
  return `${puede} pagar por ${list.join(" o ")}.`;
}

interface Bubble {
  from: "cliente" | "agente";
  text: string;
}

function buildScript(cfg: AgentPreviewConfig): Bubble[] {
  const productName = cfg.sampleProduct?.name ?? SAMPLE_PRODUCT_NAME;
  const agentLines = [greetingLine(cfg), availabilityLine(cfg), paymentLine(cfg)];
  return [
    { from: "cliente", text: "Hola, buenos días, ¿cómo estás?" },
    { from: "agente", text: withEmoji(agentLines[0], 0, cfg) },
    { from: "cliente", text: `¿Tienen ${productName} disponible?` },
    { from: "agente", text: withEmoji(agentLines[1], 1, cfg) },
    { from: "cliente", text: "¿Cómo puedo pagar?" },
    { from: "agente", text: withEmoji(agentLines[2], 2, cfg) },
  ];
}

export function AgentPreview(cfg: AgentPreviewConfig) {
  const script = buildScript(cfg);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
        Vista previa
      </p>

      {/* iPhone */}
      <div
        className="relative w-full max-w-[340px] rounded-[46px] p-[10px] shadow-2xl"
        style={{ background: "#050506", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Isla flotante (Dynamic Island) */}
        <div className="pointer-events-none absolute left-1/2 top-[18px] z-20 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />

        {/* Pantalla */}
        <div
          className="overflow-hidden rounded-[38px]"
          style={{ background: "var(--nexora-void)" }}
        >
          {/* Barra de estado + cabecera del chat */}
          <div
            className="border-b px-4 pb-3 pt-11"
            style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(238,240,247,0.08)" }}
              >
                <Bot size={17} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold" style={{ color: "var(--nexora-ink)" }}>
                  {cfg.name || "Tu Agente"}
                </p>
                <p className="text-[11px]" style={{ color: "var(--nexora-signal)" }}>
                  en línea
                </p>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex min-h-[280px] flex-col gap-2 px-3.5 py-5">
            {script.map((b, i) => (
              <div
                key={i}
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug ${
                  b.from === "agente" ? "self-start rounded-bl-md" : "self-end rounded-br-md"
                }`}
                style={
                  b.from === "agente"
                    ? { background: "var(--nexora-secondary)", color: "var(--nexora-ink)" }
                    : { background: "var(--nexora-nova)", color: "var(--nexora-nova-ink)" }
                }
              >
                {b.text}
              </div>
            ))}
          </div>

          {/* Barra de gestos (home indicator) */}
          <div className="flex justify-center pb-2 pt-1">
            <span className="h-1 w-28 rounded-full" style={{ background: "rgba(255,255,255,0.22)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
