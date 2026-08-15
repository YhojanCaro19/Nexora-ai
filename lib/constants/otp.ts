// lib/constants/otp.ts
//
// El código lo genera Supabase, no nosotros — este proyecto lo tiene
// configurado en 8 dígitos (no los 6 "de fábrica"). Cualquier input que
// capture el código, en cliente o servidor, debe usar esta constante en
// vez de un número fijo hardcodeado, para no volver a cortar el código a
// la fuerza si esto cambia.
//
// Aparte de lib/services/otpService.ts porque ese archivo usa `crypto`
// (solo servidor) y esta constante también la necesitan componentes de
// cliente (los inputs del código).
export const OTP_CODE_LENGTH = 8;
