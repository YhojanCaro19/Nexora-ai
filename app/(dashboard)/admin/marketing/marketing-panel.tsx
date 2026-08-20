"use client";

import { useState } from "react";
import { Sparkles, ImageIcon, ArrowUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateMarketingImageAction } from "./actions";
import type { MarketingImage, ImageQuality } from "@/lib/services/marketingImageService";
import { formatShortDateTime } from "@/lib/utils/date";

const QUALITY_OPTIONS: { value: ImageQuality; label: string }[] = [
  { value: "low", label: "Calidad baja" },
  { value: "medium", label: "Calidad media" },
  { value: "high", label: "Calidad alta" },
];

// Composer al estilo del cuadro de prompt de Claude.ai (saludo grande arriba
// + caja redondeada con el textarea y, debajo, un selector a la izquierda y
// el botón de enviar a la derecha) — pero en vez de elegir modelo, se elige
// calidad de imagen, que es lo único que de verdad varía acá.
export function MarketingPanel({ images: initialImages }: { images: MarketingImage[] }) {
  const [images, setImages] = useState(initialImages);
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<ImageQuality>("low");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const result = await generateMarketingImageAction(prompt, quality);
    setGenerating(false);
    if (result.error || !result.image) {
      setError(result.error ?? "No se pudo generar la imagen.");
      return;
    }
    setImages((prev) => [result.image!, ...prev]);
    setPrompt("");
  }

  const canGenerate = !generating && prompt.trim().length >= 5;

  return (
    <div className="max-w-2xl mx-auto space-y-12">
      <div className="flex flex-col items-center gap-3 text-center pt-4">
        <Sparkles size={26} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
        <h2 className="font-nexora text-2xl sm:text-3xl" style={{ color: 'var(--nexora-ink)' }}>
          ¿Qué imagen quieres crear hoy?
        </h2>
        <p className="text-xs max-w-md" style={{ color: 'var(--nexora-ink-dim)' }}>
         
        </p>
      </div>

      <div
        className="rounded-3xl border p-4 space-y-3"
        style={{ borderColor: 'var(--nexora-line)', background: 'var(--nexora-panel)' }}
      >
        <Textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej. Promo de 20% de descuento en collares de plata, fondo elegante, estilo joyería."
          maxLength={800}
          className="border-none bg-transparent shadow-none resize-none text-sm focus-visible:ring-0 px-1"
        />

        <div className="flex items-center justify-between">
          <Select value={quality} onValueChange={(v) => setQuality((v as ImageQuality) ?? "low")}>
            <SelectTrigger
              className="border-none bg-transparent text-xs h-8 px-2 hover:bg-white/[0.06]"
              style={{ color: 'var(--nexora-ink-dim)' }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            aria-label="Generar imagen"
            className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity disabled:opacity-30"
            style={{ background: 'var(--nexora-nova)', color: 'var(--nexora-nova-ink)' }}
          >
            <ArrowUp size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {generating && (
        <p className="text-xs text-center" style={{ color: 'var(--nexora-ink-dim)' }}>Generando imagen...</p>
      )}
      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--nexora-alert)' }}>{error}</p>
      )}

      <div className="space-y-3">
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          {images.length > 0 ? "Imágenes generadas" : "Todavía no has generado ninguna imagen."}
        </p>
        {images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((img) => (
              <div key={img.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--nexora-line)' }}>
                <img src={img.imageUrl} alt={img.prompt} className="w-full aspect-square object-cover" />
                <div className="p-3 space-y-1">
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--nexora-ink)' }}>{img.prompt}</p>
                  <p className="text-[11px]" style={{ color: 'var(--nexora-ink-dim)' }}>
                    {formatShortDateTime(img.createdAt)}
                  </p>
                  <a
                    href={img.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                    style={{ color: 'var(--nexora-nova)' }}
                  >
                    <ImageIcon size={12} strokeWidth={1.75} />
                    Ver / descargar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
