"use client";

import { useState, type FormEvent } from "react";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCoin } from "@/components/dashboard/shared/CreditCoin";
import { generateImageAction } from "./actions";
import type { ImageQuality } from "@/lib/services/imageService";

interface ResultState {
  src: string;
  creditsLeft: number;
  provider: string;
}

export function MarketingPanel() {
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<ImageQuality>("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    const res = await generateImageAction(text, quality);
    setLoading(false);

    if (!res.ok) {
      if (res.reason === "insufficient_credits") {
        setError(`Necesitas ${res.needed} créditos y tienes ${res.have}.`);
      } else {
        setError(res.message);
      }
      return;
    }

    setResult({
      src: `data:${res.image.mimeType};base64,${res.image.base64}`,
      creditsLeft: res.creditsLeft,
      provider: res.image.provider,
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-center gap-2">
        <Sparkles size={16} strokeWidth={1.5} style={{ color: "var(--nexora-nova)" }} />
        <h2 className="text-sm font-medium" style={{ color: "var(--nexora-ink)" }}>
          Generar una imagen
        </h2>
      </div>
      <p className="text-center text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
        Describe la imagen que necesitas para un anuncio o publicación. Estándar
        cuesta 15 créditos, HD 35.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: taza de café humeante sobre una mesa de madera, luz cálida de mañana"
          disabled={loading}
        />

        <div className="flex items-center justify-center gap-2">
          <div
            className="inline-flex rounded-full border p-1"
            style={{ borderColor: "var(--nexora-line)" }}
          >
            {(["standard", "hd"] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                className="rounded-full px-3 py-1 text-xs transition-colors"
                style={{
                  background: quality === q ? "var(--nexora-nova)" : "transparent",
                  color: quality === q ? "#0a0a0f" : "var(--nexora-ink-dim)",
                }}
              >
                {q === "standard" ? "Estándar" : "HD"}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={loading || !prompt.trim()}>
            {loading ? "Generando..." : "Generar"}
          </Button>
        </div>
      </form>

      {error && (
        <p
          className="rounded-lg border p-3 text-center text-sm"
          style={{
            borderColor: "rgba(248,113,113,0.3)",
            background: "rgba(248,113,113,0.08)",
            color: "var(--nexora-alert)",
          }}
        >
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.src}
            alt="Imagen generada"
            className="w-full rounded-2xl border"
            style={{ borderColor: "var(--nexora-line)" }}
          />
          <p
            className="flex items-center justify-center gap-1.5 text-xs"
            style={{ color: "var(--nexora-ink-dim)" }}
          >
            <CreditCoin className="h-3.5 w-3.5" />
            {result.creditsLeft.toLocaleString("es-CO")} créditos · {result.provider}
          </p>
        </div>
      )}

      {!result && !error && !loading && (
        <div
          className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-12"
          style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink-dim)" }}
        >
          <ImageIcon size={22} strokeWidth={1.5} />
          <p className="text-xs">La imagen generada aparecerá aquí.</p>
        </div>
      )}
    </div>
  );
}
