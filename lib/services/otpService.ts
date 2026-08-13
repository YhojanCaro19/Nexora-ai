// lib/services/otpService.ts
//
// Marca "verificó su código OTP hace poco" — una cookie firmada (HMAC), no
// solo un valor plano. Si fuera un valor plano, cualquiera con acceso a las
// devtools de SU PROPIO navegador podría escribir la cookie a mano y
// saltarse la verificación de correo sin haber recibido ningún código. El
// HMAC hace que esa cookie sea imposible de fabricar sin conocer el secreto
// del servidor.
//
// El secreto usado es SUPABASE_SERVICE_ROLE_KEY — no porque tenga que ver
// con Supabase, sino porque ya es un secreto real, impredecible, que solo
// vive en el servidor. Firmar con HMAC no expone ni debilita esa key (el
// HMAC no se puede invertir para recuperarla).
import { createHmac, timingSafeEqual } from "crypto";

const OTP_COOKIE_NAME = "otp_verified";
const OTP_VALID_MS = 5 * 60 * 1000; // 5 minutos

function signingSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return secret;
}

function hmac(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

export function signOtpVerification(userId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${userId}.${timestamp}`;
  return `${payload}.${hmac(payload)}`;
}

export function isOtpVerificationValid(cookieValue: string | undefined | null, userId: string): boolean {
  if (!cookieValue) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;
  const [cookieUserId, timestampStr, signature] = parts;
  if (cookieUserId !== userId) return false;

  const expected = hmac(`${cookieUserId}.${timestampStr}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= OTP_VALID_MS;
}

export const OTP_COOKIE = {
  name: OTP_COOKIE_NAME,
  maxAgeSeconds: OTP_VALID_MS / 1000,
};
