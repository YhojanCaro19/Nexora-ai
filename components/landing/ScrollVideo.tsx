"use client";

import { useEffect, useRef, useState } from "react";

export const ScrollVideo = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenVideoRef = useRef<HTMLVideoElement>(null);
  const [framesReady, setFramesReady] = useState(false);
  const [posterHidden, setPosterHidden] = useState(false);

  useEffect(() => {
    const videoUrl =
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4";
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const offscreenVideo = document.createElement("video");

    if (!container || !canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let extractedFrames: ImageBitmap[] = [];
    let targetProgress = 0;
    let currentProgress = 0;
    let isExtracting = false;
    let duration = 0;

    // Configuración de DPR
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 1. Configurar Video visible (para poster y fallback)
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    // 2. Configurar Offscreen Video (para extraer frames)
    offscreenVideo.src = videoUrl;
    offscreenVideo.muted = true;
    offscreenVideo.crossOrigin = "anonymous";
    offscreenVideo.preload = "auto";

    const handleVideoLoaded = async () => {
      duration = video.duration;
      // Esperar un poco para que el decode termine
      await new Promise((r) => setTimeout(r, 300));
      
      // Ocultar poster suavemente
      setPosterHidden(true);

      // Extraer frames
      if (!isExtracting && offscreenVideo.readyState >= 2) {
        isExtracting = true;
        const numFrames = Math.min(Math.floor(duration * 12), 90);
        const step = duration / numFrames;

        try {
          for (let i = 0; i < numFrames; i++) {
            const time = i * step;
            offscreenVideo.currentTime = time;
            await new Promise((r) => setTimeout(r, 20)); // Pequeño yield para no bloquear
            if (offscreenVideo.readyState >= 2) {
              const bitmap = await createImageBitmap(offscreenVideo);
              extractedFrames.push(bitmap);
            }
          }
          setFramesReady(true);
        } catch (e) {
          console.warn("Error extrayendo frames, usando fallback de seek", e);
          setFramesReady(false);
        }
      }
    };

    video.addEventListener("loadeddata", handleVideoLoaded);
    offscreenVideo.addEventListener("loadeddata", handleVideoLoaded);

    // 3. Lógica de Redimensionamiento (object-cover math)
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 4. Bucle de animación (Scroll Scrubbing + Lerp)
    const animate = () => {
      // Lerp suavizado (0.12 es más rápido para sentirse responsivo, 0.08 es más cinematic)
      currentProgress += (targetProgress - currentProgress) * 0.12;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // Math para object-cover (escalar al máximo y centrar)
      const scaleX = width / 1920;
      const scaleY = height / 1080;
      const scale = Math.max(scaleX, scaleY);
      const drawWidth = 1920 * scale;
      const drawHeight = 1080 * scale;
      const offsetX = (drawWidth - width) / 2;
      const offsetY = (drawHeight - height) / 2;

      ctx.clearRect(0, 0, width, height);

      if (framesReady && extractedFrames.length > 0) {
        // Usar el frame cacheado
        const index = Math.floor(currentProgress * (extractedFrames.length - 1));
        const frame = extractedFrames[index];
        if (frame) {
          ctx.drawImage(frame, -offsetX, -offsetY, drawWidth, drawHeight);
        }
      } else {
        // Fallback: Mover el video visible
        video.currentTime = Math.min(currentProgress * duration, duration - 0.05);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // 5. Mapeo del Scroll
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      targetProgress = Math.max(0, Math.min(1, scrollY / maxScroll));
    };

    window.addEventListener("scroll", handleScroll);
    animate(); // Iniciar loop

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
      extractedFrames.forEach((frame) => frame.close());
      video.removeEventListener("loadeddata", handleVideoLoaded);
      offscreenVideo.removeEventListener("loadeddata", handleVideoLoaded);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a0a0a]">
      {/* Poster Image */}
      <img
        src="/hero-poster.jpg"
        alt="Hero poster"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          posterHidden ? "opacity-0" : "opacity-100"
        }`}
      />
      
      {/* Video Principal (Oculto cuando el canvas está listo, visible para fallback) */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          framesReady ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Canvas de renderizado */}
      <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
        framesReady ? "opacity-100" : "opacity-0"
      }`} />
    </div>
  );
};