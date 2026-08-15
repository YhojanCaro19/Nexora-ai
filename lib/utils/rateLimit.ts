// lib/utils/rateLimit.ts
//
// Rate limiting simple, en memoria, sin dependencias nuevas ni servicios
// externos — para frenar a alguien mandando muchas peticiones seguidas
// (login, descargas, subidas) antes de que eso tumbe el servidor o sirva
// para probar contraseñas por fuerza bruta.
//
// Limitación real, no escondida: este contador vive en la memoria de la
// instancia del servidor. Si la app llega a correr en varias instancias
// a la vez (serverless con más de una función activa), cada una lleva su
// propio conteo — el límite real efectivo sería el límite configurado
// multiplicado por el número de instancias, no un límite global exacto.
// Para eso sí hace falta un store compartido (ej. Upstash Redis), que no
// se instala aquí sin decidirlo aparte — hoy, con el tráfico que tiene
// AVENTHRA, esto ya frena el caso real (alguien o algo mandando ráfagas
// de peticiones), que es lo que importa ahora.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Evita que el Map crezca para siempre con IPs/usuarios que ya vencieron.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// `key` debe identificar a quién se le está limitando (ip:accion,
// userId:accion, etc.) — mientras más específica, menos se castiga a
// gente que no tiene nada que ver.
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
