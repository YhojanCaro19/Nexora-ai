// app/page.tsx
'use client';

import { HomeExperience } from '@/components/landing/HomeExperience';

export default function Home() {
  // Home partido en 2 momentos (HomeExperience), IGUAL en desktop y en
  // móvil (pedido del usuario: "lo mismo que la versión desktop pero en
  // móvil"): Pantalla 1 estática (wordmark AVENTHRA + "Tu empleado
  // virtual" + señal de SCROLL) y, al scrollear, la Pantalla 2 sube y
  // tapa — la landing completa (ProductosLanding).
  //
  // En móvil no hay robot 3D ni wordmark 3D: el fondo de estrellas lo
  // pone Experience.tsx (AuthStarfield) y HomeExperience adapta el tamaño
  // del wordmark de Pantalla 1 con breakpoints. HomeExperience monta su
  // propio ScreenTwoNavbar dentro de la Pantalla 2.
  return <HomeExperience />;
}
