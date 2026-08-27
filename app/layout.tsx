// app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Space_Grotesk } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// Tipografía de la landing (títulos + copy de marketing) — geométrica y
// moderna, en la línea de saleads.ai. El resto de la app (panel) sigue con
// Geist.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-data",
});

export const metadata: Metadata = {
  title: {
    default: "AVENTHRA",
    template: "%s | AVENTHRA",
  },
  description: "Siempre hay alguien cuidando tu negocio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}