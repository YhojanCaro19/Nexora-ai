"use client";

// Vista previa "en vivo" del agente — un teléfono con una conversación de
// ejemplo que se re-arma en el navegador cada vez que cambia la config.
// NO llama a la API (cero costo, instantáneo). Es una APROXIMACIÓN: aplica
// reglas simples (saludo, emojis, tú/usted, longitud, métodos de pago) a
// unas frases de muestra. El agente de verdad se prueba en "Probar tu
// agente" más abajo — eso sí usa el modelo real.
import { ChevronLeft, Phone, Video, MoreVertical, Plus, Camera, Mic, CheckCheck } from "lucide-react";
import type { PaymentMethod } from "@/lib/config/agentPersona";
import { PREVIEW_SCRIPTS, previewArchetypeFor, type PreviewCtx } from "@/lib/config/agentPreviewScripts";

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
  /** businesses.industry_type — decide el guion de la conversación. */
  industryType: string | null;
}

// Swap "vos/tú" → "usted" para la vista previa. Diccionario chico y por
// límite de palabra — es una aproximación, no un traductor.
const USTED_SWAPS: [RegExp, string][] = [
  [/\bdecime\b/gi, "dígame"],
  [/\bcontame\b/gi, "cuénteme"],
  [/\bcontá\b/gi, "cuente"],
  [/\bquerés\b/gi, "quiere"],
  [/\bpodés\b/gi, "puede"],
  [/\bbuscás\b/gi, "busca"],
  [/\bnecesitás\b/gi, "necesita"],
  [/\btenés\b/gi, "tiene"],
  [/\bpasás\b/gi, "pasa"],
  [/\bpases\b/gi, "pase"],
  [/\bte queda\b/gi, "le queda"],
  [/\bte lo\b/gi, "se lo"],
  [/\bte digo\b/gi, "le digo"],
  [/\bte decimos\b/gi, "le decimos"],
  [/\bte agendo\b/gi, "le agendo"],
  [/\btu dirección\b/gi, "su dirección"],
  [/\ba tu dirección\b/gi, "a su dirección"],
];

function swapToUsted(text: string): string {
  return USTED_SWAPS.reduce((acc, [re, rep]) => acc.replace(re, rep), text);
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

const isUsted = (cfg: AgentPreviewConfig) => cfg.addressForm === "usted";

// Aplica el swap a usted (si toca) y el emoji del turno.
function agentText(line: string, i: number, cfg: AgentPreviewConfig): string {
  const t = isUsted(cfg) ? swapToUsted(line) : line;
  return withEmoji(t, i, cfg);
}

function greetingLine(cfg: AgentPreviewConfig): string {
  if (cfg.greeting.trim()) return cfg.greeting.trim();
  const soy = `Soy ${cfg.name || "tu asistente"}${cfg.businessName ? `, de ${cfg.businessName}` : ""}`;
  return isUsted(cfg)
    ? `¡Hola, buenos días! Todo bien por acá, gracias. ${soy}. ¿En qué le puedo ayudar?`
    : `¡Hola, buenos días! Todo bien por acá, gracias. ${soy}. ¿En qué te ayudo?`;
}

function paymentLine(cfg: AgentPreviewConfig): string {
  const puede = isUsted(cfg) ? "Puede" : "Podés";
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
  const script = PREVIEW_SCRIPTS[previewArchetypeFor(cfg.industryType)];
  const item = cfg.sampleProduct?.name ?? script.genericItem;
  const price = cfg.sampleProduct ? formatCOP(cfg.sampleProduct.price) : null;
  const ctx: PreviewCtx = { usted: isUsted(cfg), length: cfg.responseLength, item, price };

  return [
    { from: "cliente", text: "Hola, buenos días, ¿cómo estás?" },
    { from: "agente", text: withEmoji(greetingLine(cfg), 0, cfg) },
    { from: "cliente", text: script.clientQuestion(item) },
    { from: "agente", text: agentText(script.agentAnswer(ctx), 1, cfg) },
    { from: "cliente", text: "¿Cómo puedo pagar?" },
    { from: "agente", text: withEmoji(paymentLine(cfg), 2, cfg) },
  ];
}

// Colores WhatsApp (mockup fiel, no usa los tokens Nexora a propósito).
const WA = {
  wallpaper: "#dbe6dc",
  header: "#f6f6f6",
  headerInk: "#111b21",
  subtle: "#667781",
  accent: "#008069",
  incoming: "#ffffff",
  outgoing: "#d9fdd3",
  bubbleInk: "#111b21",
  tick: "#53bdeb",
  inputBar: "#f0f2f5",
};

const TIMES = ["10:31", "10:31", "10:32", "10:32", "10:33", "10:33"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function AgentPreview(cfg: AgentPreviewConfig) {
  const script = buildScript(cfg);
  const agentName = cfg.name || "Tu Agente";

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--nexora-ink-dim)" }}>
        Vista previa
      </p>

      {/* Teléfono — de frente */}
      <div
        className="relative w-full max-w-[330px] rounded-[42px] p-[9px]"
        style={{ background: "#0c0c0d", boxShadow: "0 24px 60px -12px rgba(0,0,0,0.6)" }}
      >
        {/* Cámara / isla */}
        <div className="pointer-events-none absolute left-1/2 top-[16px] z-20 h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-black" />

        {/* Pantalla */}
        <div className="overflow-hidden rounded-[34px]" style={{ background: WA.wallpaper }}>
          {/* Cabecera WhatsApp */}
          <div
            className="flex items-center gap-2 px-2 pb-2.5 pt-10"
            style={{ background: WA.header, color: WA.headerInk }}
          >
            <ChevronLeft size={20} strokeWidth={2} style={{ color: WA.subtle }} className="shrink-0" />
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
              style={{ background: WA.accent }}
            >
              {initials(agentName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight">{agentName}</p>
              <p className="text-[11px]" style={{ color: WA.subtle }}>
                en línea
              </p>
            </div>
            <Video size={18} strokeWidth={2} style={{ color: WA.subtle }} className="shrink-0" />
            <Phone size={16} strokeWidth={2} style={{ color: WA.subtle }} className="shrink-0" />
            <MoreVertical size={18} strokeWidth={2} style={{ color: WA.subtle }} className="shrink-0" />
          </div>

          {/* Mensajes */}
          <div className="flex min-h-[320px] flex-col gap-1.5 px-2.5 py-3">
            {script.map((b, i) => {
              const outgoing = b.from === "cliente";
              return (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-lg px-2 py-1.5 text-[13px] leading-snug shadow-sm ${
                    outgoing ? "self-end rounded-tr-none" : "self-start rounded-tl-none"
                  }`}
                  style={{ background: outgoing ? WA.outgoing : WA.incoming, color: WA.bubbleInk }}
                >
                  <span>{b.text}</span>
                  <span
                    className="ml-2 inline-flex translate-y-[3px] items-center gap-0.5 text-[10px]"
                    style={{ color: WA.subtle }}
                  >
                    {TIMES[i]}
                    {outgoing && <CheckCheck size={13} strokeWidth={2.25} style={{ color: WA.tick }} />}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Barra de escribir (decorativa) */}
          <div className="flex items-center gap-1.5 px-2 py-2" style={{ background: WA.wallpaper }}>
            <div
              className="flex flex-1 items-center gap-2 rounded-full px-3 py-2"
              style={{ background: "#ffffff", color: WA.subtle }}
            >
              <Plus size={17} strokeWidth={2} />
              <span className="flex-1 text-[13px]">Mensaje</span>
              <Camera size={16} strokeWidth={2} />
            </div>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: WA.accent }}
            >
              <Mic size={16} strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
