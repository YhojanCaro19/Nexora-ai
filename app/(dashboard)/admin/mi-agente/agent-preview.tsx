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

function greetingLine(cfg: AgentPreviewConfig): string {
  if (cfg.greeting.trim()) return cfg.greeting.trim();
  const soy = `Soy ${cfg.name || "tu asistente"}${cfg.businessName ? `, de ${cfg.businessName}` : ""}`;
  return usted(cfg)
    ? `¡Hola! ${soy}. ¿En qué le puedo ayudar?`
    : `¡Hola! ${soy}. ¿En qué te ayudo?`;
}

function catalogLine(cfg: AgentPreviewConfig): string {
  if (cfg.responseLength === "corta") {
    return usted(cfg) ? "Claro, dígame qué busca y le paso el precio." : "Claro, decime qué buscás y te paso el precio.";
  }
  if (cfg.responseLength === "larga") {
    return usted(cfg)
      ? "Con gusto le muestro el catálogo. Tenemos varias opciones con sus precios y detalles — cuénteme qué necesita y le doy toda la información para que elija tranquilo."
      : "Con gusto te muestro el catálogo. Tenemos varias opciones con sus precios y detalles — contame qué necesitás y te doy toda la info para que elijas tranquilo.";
  }
  return usted(cfg)
    ? "Claro, le muestro el catálogo. Dígame qué busca y le doy el precio."
    : "Claro, te muestro el catálogo. Decime qué buscás y te doy el precio.";
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
  const agentLines = [greetingLine(cfg), catalogLine(cfg), paymentLine(cfg)];
  return [
    { from: "cliente", text: "Hola, buenas" },
    { from: "agente", text: withEmoji(agentLines[0], 0, cfg) },
    { from: "cliente", text: "¿Qué precios manejan?" },
    { from: "agente", text: withEmoji(agentLines[1], 1, cfg) },
    { from: "cliente", text: "¿Cómo puedo pagar?" },
    { from: "agente", text: withEmoji(agentLines[2], 2, cfg) },
  ];
}

const CHIP_LABELS: Record<string, string> = {
  tu: "Tutea",
  usted: "De usted",
  ninguno: "Sin emojis",
  pocos: "Pocos emojis",
  personalizado: "Emojis propios",
  corta: "Respuestas cortas",
  media: "Respuestas medias",
  larga: "Respuestas largas",
};

export function AgentPreview(cfg: AgentPreviewConfig) {
  const script = buildScript(cfg);
  const chips = [
    cfg.addressForm !== "auto" ? CHIP_LABELS[cfg.addressForm] : null,
    CHIP_LABELS[cfg.emojiMode],
    cfg.responseLength ? CHIP_LABELS[cfg.responseLength] : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
        Vista previa
      </p>

      {/* Teléfono */}
      <div
        className="w-full max-w-[300px] overflow-hidden rounded-[26px] border shadow-xl"
        style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-void)" }}
      >
        {/* Barra del chat */}
        <div
          className="flex items-center gap-2.5 border-b px-3.5 py-3"
          style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(238,240,247,0.08)" }}
          >
            <Bot size={15} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--nexora-ink)" }}>
              {cfg.name || "Tu Agente"}
            </p>
            <p className="text-[11px]" style={{ color: "var(--nexora-signal)" }}>
              en línea
            </p>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex flex-col gap-2 px-3 py-4">
          {script.map((b, i) => (
            <div
              key={i}
              className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                b.from === "agente" ? "self-start rounded-bl-sm" : "self-end rounded-br-sm"
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
      </div>

      {/* Chips de la persona */}
      {chips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border px-2 py-0.5 text-[11px]"
              style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {cfg.localPhrases.trim() && (
        <p className="text-center text-[11px]" style={{ color: "var(--nexora-ink-dim)" }}>
          Modismos: {cfg.localPhrases.trim()}
        </p>
      )}

      <p className="max-w-[280px] text-center text-[10px]" style={{ color: "var(--nexora-ink-dim)" }}>
        Muestra aproximada. Para probar el agente de verdad, usá el chat de abajo.
      </p>
    </div>
  );
}
