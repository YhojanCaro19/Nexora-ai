// components/landing/AnimatedBackground.tsx
"use client";

import { useEffect, useRef } from 'react';

export const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles: Particle[] = [];
    let mouseX = width / 2;
    let mouseY = height / 2;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      pulse: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.3 + 0.1;
        this.pulse = Math.random() * Math.PI * 2;
      }

      update() {
        this.pulse += 0.01;
        this.x += this.speedX + (mouseX - width / 2) * 0.0001;
        this.y += this.speedY + (mouseY - height / 2) * 0.0001;

        if (this.x < 0 || this.x > width) this.speedX *= -1;
        if (this.y < 0 || this.y > height) this.speedY *= -1;
      }

      draw(ctx: CanvasRenderingContext2D) {
        const opacity = this.opacity * (0.8 + 0.2 * Math.sin(this.pulse));
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(76, 194, 232, ${opacity})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < 80; i++) {
      particles.push(new Particle());
    }

    function drawConnections(ctx: CanvasRenderingContext2D) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(76, 194, 232, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    // Glows recoloreados para coincidir con la paleta de la intro
    // (cyan primario + acentos índigo/violeta muy contenidos)
    function drawGlowSpots(ctx: CanvasRenderingContext2D) {
      const gradient = ctx.createRadialGradient(
        width * 0.18, height * 0.28, 0,
        width * 0.18, height * 0.28, width * 0.5
      );
      gradient.addColorStop(0, 'rgba(76, 194, 232, 0.07)');
      gradient.addColorStop(1, 'rgba(76, 194, 232, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const gradient2 = ctx.createRadialGradient(
        width * 0.82, height * 0.72, 0,
        width * 0.82, height * 0.72, width * 0.42
      );
      gradient2.addColorStop(0, 'rgba(129, 140, 248, 0.05)');
      gradient2.addColorStop(1, 'rgba(129, 140, 248, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);

      const gradient3 = ctx.createRadialGradient(
        width * 0.55, height * -0.05, 0,
        width * 0.55, height * -0.05, width * 0.35
      );
      gradient3.addColorStop(0, 'rgba(167, 139, 250, 0.04)');
      gradient3.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, width, height);
    }

    function animate() {
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      drawGlowSpots(ctx);

      particles.forEach((particle) => {
        particle.update();
        particle.draw(ctx);
      });

      drawConnections(ctx);

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: '#08090D' }}
      />
      {/* Grano fino: la misma textura atmosférica que la intro */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Viñeta ligera: profundidad sin robar foco al contenido */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(4,5,8,0.45)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#08090D]/0 via-[#08090D]/50 to-[#08090D]" />
    </div>
  );
};