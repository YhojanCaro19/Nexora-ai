"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
// Resolución del recorte exportado — más grande que el avatar final (144px
// en pantalla) para no perder nitidez en pantallas de alta densidad. El
// server (sanitizeImageUpload, fit: "inside") lo reduce a 400px de todos
// modos, así que esto solo evita subir algo ya borroso de entrada.
const EXPORT_SIZE = 480;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Editor de encuadre para la foto de perfil: se muestra ANTES de subir,
// no hay librería de crop instalada en el proyecto (ver package.json), así
// que se construye con lo que ya hay — canvas nativo para generar el
// recorte final y pointer events nativos para arrastrar (mismo criterio
// que components/shared/MultiSelectSearch.tsx: portal a document.body para
// no chocar con el overflow-hidden de las Card, sin depender de Radix/cmdk).
//
// El área circular visible (mismo tamaño que el avatar final, `size`) es a
// la vez el preview en vivo y la ventana de recorte: lo que se ve dentro
// del círculo es exactamente lo que termina subiéndose, porque
// Avatar.tsx siempre muestra la foto recortada por CSS dentro de un
// círculo — exportamos ese mismo cuadrado, nunca el círculo con
// transparencia (el pipeline server solo sabe de JPEG opaco).
export function AvatarCropper({
  file,
  size = 144,
  onCancel,
  onConfirm,
}: {
  file: File;
  size?: number;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Un objectURL por archivo elegido — se deriva directo en el render con
  // useMemo (no useState+efecto: el valor depende únicamente de `file`, no
  // hace falta sincronizar nada externo salvo liberarlo después, que es lo
  // único que le corresponde a un efecto). Liberado al desmontar o al
  // cambiar de archivo, mismo cuidado que ya hacía handleAvatarChange con
  // la preview optimista.
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  // Cerrar con Escape, mismo gesto que se espera de cualquier overlay modal.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // baseScale hace que el lado más chico de la imagen cubra el círculo
  // completo a zoom mínimo (equivalente a object-fit: cover) — nunca deja
  // huecos vacíos dentro del área de recorte.
  const baseScale = natural ? size / Math.min(natural.width, natural.height) : 0;
  const scale = baseScale * zoom;
  const displayWidth = (natural?.width ?? 0) * scale;
  const displayHeight = (natural?.height ?? 0) * scale;

  const maxOffset = useMemo(
    () => ({
      x: Math.max(0, (displayWidth - size) / 2),
      y: Math.max(0, (displayHeight - size) / 2),
    }),
    [displayWidth, displayHeight, size]
  );

  // `offset` en sí puede quedar temporalmente fuera de rango cuando el
  // zoom baja (el rango permitido se achica) — en vez de reajustar el
  // estado en un efecto, se recorta acá, derivado, en cada render. Tanto
  // el preview como el recorte final en handleConfirm usan siempre este
  // valor ya acotado, nunca el `offset` crudo.
  const clampedOffset = {
    x: clamp(offset.x, -maxOffset.x, maxOffset.x),
    y: clamp(offset.y, -maxOffset.y, maxOffset.y),
  };

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => ({
      x: clamp(prev.x + dx, -maxOffset.x, maxOffset.x),
      y: clamp(prev.y + dy, -maxOffset.y, maxOffset.y),
    }));
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }

  // Rueda del mouse como atajo de zoom en desktop, además del slider (que
  // es el control principal y el único necesario en touch).
  function handleWheel(e: ReactWheelEvent<HTMLDivElement>) {
    e.preventDefault();
    setZoom((z) => clamp(z + (e.deltaY < 0 ? 0.08 : -0.08), MIN_ZOOM, MAX_ZOOM));
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !natural) return;
    setProcessing(true);

    // Traduce la ventana de recorte (el cuadrado de `size` px del preview,
    // esquina superior izquierda en 0,0) a coordenadas reales de la imagen
    // fuente, siguiendo la misma matemática que posiciona el <img> en el
    // preview (mitad del contenedor + offset, menos la mitad del tamaño
    // mostrado = esquina superior izquierda del <img>).
    const imgLeft = size / 2 - displayWidth / 2 + clampedOffset.x;
    const imgTop = size / 2 - displayHeight / 2 + clampedOffset.y;
    const sourceSize = size / scale;
    const sourceX = clamp((0 - imgLeft) / scale, 0, natural.width - sourceSize);
    const sourceY = clamp((0 - imgTop) / scale, 0, natural.height - sourceSize);

    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setProcessing(false);
      return;
    }
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

    canvas.toBlob(
      (blob) => {
        setProcessing(false);
        if (!blob) return;
        onConfirm(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="w-full max-w-xs rounded-xl ring-1 ring-foreground/10 p-5 flex flex-col items-center gap-4"
        style={{ background: "var(--nexora-panel)" }}
      >
        <p className="font-nexora text-sm text-center" style={{ color: "var(--nexora-ink)" }}>
          Ajustar foto
        </p>

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className="relative rounded-full overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
          style={{ width: size, height: size, background: "var(--nexora-secondary)", border: "1px solid var(--nexora-line)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- objectURL local, mismo criterio que Avatar.tsx */}
          <img
            ref={imgRef}
            src={objectUrl}
            alt=""
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              position: "absolute",
              left: size / 2 + clampedOffset.x,
              top: size / 2 + clampedOffset.y,
              width: displayWidth || undefined,
              height: displayHeight || undefined,
              maxWidth: "none",
              transform: "translate(-50%, -50%)",
              visibility: natural ? "visible" : "hidden",
            }}
          />
        </div>

        <div className="w-full flex items-center gap-2 px-1">
          <ZoomOut size={15} strokeWidth={1.75} style={{ color: "var(--nexora-ink-dim)" }} />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!natural}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[var(--nexora-nova)]"
            aria-label="Zoom"
          />
          <ZoomIn size={15} strokeWidth={1.75} style={{ color: "var(--nexora-ink-dim)" }} />
        </div>

        <p className="text-xs text-center" style={{ color: "var(--nexora-ink-dim)" }}>
          Arrastra la foto para moverla dentro del círculo
        </p>

        <div className="flex gap-2 justify-center pt-1">
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing || !natural}>
            {processing ? "Procesando..." : "Usar esta foto"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
