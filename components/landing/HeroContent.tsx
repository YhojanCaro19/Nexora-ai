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
    <div className="w-full flex items-center min-h-screen px-6 md:px-10 lg:px-16">
      <div className="w-full max-w-xl ml-0 lg:ml-8 xl:ml-12 2xl:ml-16 flex flex-col items-start text-left">
        <h1 className="nexora-headline text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.15] tracking-tight text-white">
          Siempre hay alguien <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4CC2E8] via-[#818CF8] to-[#A78BFA]">
            cuidando tu negocio.
          </span>
        </h1>

        <p className="mt-5 max-w-md text-white/40 text-sm md:text-base font-light leading-relaxed">
          AVENTHRA es el empleado inteligente que atiende a tus clientes, impulsa tus ventas y automatiza tu negocio, las 24 horas del día. Tú decides las reglas; él se encarga del resto.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link href="/dashboard">
            <span className="group px-6 py-3 rounded-full bg-[#4CC2E8] text-black text-sm font-medium inline-flex items-center gap-2 hover:shadow-[0_0_30px_rgba(76,194,232,0.2)] transition-all">
              Empezar ahora
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          <Link href="/contacto">
            <span className="px-6 py-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 text-sm font-light hover:bg-white/10 transition-colors inline-block">
              Ver cómo funciona
            </span>
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .nexora-headline {
          font-family: 'General Sans', var(--font-geist-sans, ui-sans-serif), sans-serif;
        }
      `}</style>
    </div>
  );
};