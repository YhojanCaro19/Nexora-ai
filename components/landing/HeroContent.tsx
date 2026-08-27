// components/landing/HeroContent.tsx
//Aplicar intentos por minuto en el login
//Que mediante la URL no se pueda acceder al login de alguien mas (ejemplo de clase)
// el hash se regenera
// proteccion apis
//Factor de autenticacion para el superadmin, admins, y empleados(Para cambiar contraseña o correo de inicio)
//scanear puertos de servidores
//Limitar trafico a la base de datos(rate limiting)
//Aplicar backups, control de versiones(despliegue)

'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export const HeroContent = () => {
  return (
    // lg:min-h-[calc(100vh-6rem)] en vez de min-h-screen a secas: en
    // desktop el <main> padre ya reserva 6rem (h-24) arriba para la barra
    // horizontal fija (ver Experience.tsx), así que centrar verticalmente
    // contra el 100vh completo dejaría este bloque corrido hacia abajo
    // respecto al espacio real visible debajo de la barra.
    <div className="w-full flex items-center min-h-screen lg:min-h-[calc(100vh-6rem)] px-6 md:px-10 lg:px-16">
      <div className="w-full max-w-xl ml-0 lg:ml-8 xl:ml-12 2xl:ml-16 flex flex-col items-start text-left">
        <h1 className="nexora-headline text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.15] tracking-tight text-white">
          Siempre hay alguien <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4CC2E8] via-[#818CF8] to-[#A78BFA]">
            cuidando tu negocio.
          </span>
        </h1>

        {/* text-white/70 solo en mobile (md: vuelve a /40) — pedido
            explícito: "es un poco complejo leerla" en la versión mobile,
            el 40% de opacidad original quedaba muy tenue en pantallas
            chicas. Desktop no se tocó, ahí no hubo queja. */}
        <p className="mt-5 max-w-md text-white/70 md:text-white/40 text-sm md:text-base font-light leading-relaxed">
          AVENTHRA es el empleado inteligente que atiende a tus clientes, impulsa tus ventas y automatiza tu negocio, las 24 horas del día. Tú decides las reglas; él se encarga del resto.
        </p>

        {/* max-w-md igual que el párrafo de arriba, con justify-center: el
            botón queda centrado respecto al ANCHO DEL TEXTO, no pegado a su
            borde izquierdo — sin mover el título ni el párrafo de su sitio. */}
        <div className="mt-8 w-full max-w-md flex justify-center">
          <Link href="/contacto">
            <span className="group px-6 py-3 rounded-full bg-[#4CC2E8] text-black text-sm font-medium inline-flex items-center gap-2 hover:shadow-[0_0_30px_rgba(76,194,232,0.2)] transition-all">
              Empezar ahora
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};