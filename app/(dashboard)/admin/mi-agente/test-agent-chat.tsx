"use client";

import { useState, type FormEvent } from "react";
import { Send, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { probarAgenteAction } from "./actions";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Canal de prueba interno del agente — para probar antes de tener
// WhatsApp conectado (fase aparte). Habla directo con runAgentTurn vía
// server action, sin depender de ningún canal externo.
export function TestAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    const result = await probarAgenteAction(text);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-center gap-2">
        <FlaskConical size={16} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
        <h2 className="text-sm font-medium text-center" style={{ color: 'var(--nexora-ink)' }}>
          Probar tu agente
        </h2>
      </div>
      <p className="text-xs text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
        Chatea acá como si fueras un cliente — este canal es solo tuyo, no llega a clientes reales.
      </p>

      <div
        className="rounded-2xl border p-4 space-y-3 min-h-[200px] max-h-[400px] overflow-y-auto"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      >
        {messages.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--nexora-ink-dim)' }}>
            Escribe algo abajo para empezar la conversación.
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap"
                style={{
                  background: m.role === "user" ? 'var(--nexora-nova)' : 'rgba(255,255,255,0.06)',
                  color: m.role === "user" ? '#0a0a0f' : 'var(--nexora-ink)',
                }}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>El agente está escribiendo...</p>
        )}
      </div>

      {error && (
        <p
          className="rounded-lg border p-3 text-sm text-center"
          style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--nexora-alert)' }}
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send size={16} strokeWidth={1.5} />
        </Button>
      </form>
    </div>
  );
}
