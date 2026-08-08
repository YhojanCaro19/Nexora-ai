"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X, Users, MessageCircle, LogIn } from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    label: "Sobre nosotros",
    href: "/sobre-nosotros",
    icon: Users,
  },
  {
    label: "Contáctanos",
    href: "/contacto",
    icon: MessageCircle,
  },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* DESKTOP */}

      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[260px] z-50 flex-col px-10 py-10">

        {/* Logo */}
        <Link href="/" className="block">

          <h1 className="aventhra-logo text-[1.9rem] tracking-[0.18em] text-white">
            AVENTHRA
          </h1>

          <p className="mt-2 w-fit max-w-[170px] text-center text-[10px] uppercase tracking-[0.35em] text-white/35 leading-5">
            Tu empleado virtual
          </p>

        </Link>

        {/* Menú + Iniciar sesión (centrado verticalmente como un solo bloque) */}
        <div className="flex-1 flex flex-col items-start justify-center">

          <nav className="flex flex-col gap-7">

            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 pl-5 text-[15px] font-light text-white/55 transition-all duration-300 hover:text-white hover:translate-x-1"
                >
                  <Icon
                    size={16}
                    strokeWidth={1.5}
                    className="text-white/35 transition-colors duration-300 group-hover:text-white/70"
                  />
                  {item.label}
                </Link>
              );
            })}

          </nav>

          <Link
            href="/login"
            className="group mt-10 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-white/75 transition-all duration-300 hover:border-white/30 hover:bg-white/5 hover:text-white"
          >
            <LogIn
              size={15}
              strokeWidth={1.5}
              className="text-white/50 transition-colors duration-300 group-hover:text-white"
            />
            Iniciar sesión
          </Link>

        </div>

      </aside>

      {/* MOBILE */}

      <nav className="md:hidden fixed top-0 left-0 right-0 z-50">

        <div className="flex justify-between items-center px-6 py-5">

          <Link href="/">
            <span className="aventhra-logo text-white tracking-[0.18em] text-lg">
              AVENTHRA
            </span>
          </Link>

          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? (
              <X className="text-white" size={22} />
            ) : (
              <Menu className="text-white" size={22} />
            )}
          </button>

        </div>

        <motion.div
          initial={false}
          animate={{
            height: isOpen ? "auto" : 0,
            opacity: isOpen ? 1 : 0,
          }}
          transition={{
            duration: .4,
          }}
          className="overflow-hidden bg-[#08090D]/90 backdrop-blur-xl"
        >

          <div className="flex flex-col gap-6 px-6 py-6">

            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-white/70"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="inline-flex w-fit rounded-full border border-white/15 px-5 py-2 text-white/80"
            >
              Iniciar sesión
            </Link>

          </div>

        </motion.div>

      </nav>

      <style jsx global>{`
        .aventhra-logo {
          font-family: var(--font-space-grotesk), sans-serif;
          font-weight: 500;
        }
      `}</style>

    </>
  );
};