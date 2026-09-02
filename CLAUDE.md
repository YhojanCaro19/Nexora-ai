@AGENTS.md

## Notas específicas de Claude Code

- Antes de tocar RLS o políticas de Supabase, explica el cambio y espera confirmación.
- Nunca uses la service role key fuera de server actions marcados "use server".
- Al crear una página nueva bajo app/(dashboard)/, sigue el patrón ya existente: layout.tsx valida rol y mustChangePassword, page.tsx hace la consulta de datos.

## Antes de desplegar a producción — bloqueadores duros
No se puede sacar AVENTHRA a producción hasta tener TODO esto funcionando de verdad, probado y configurado. Si en algún momento se habla de desplegar/lanzar, recordar esta lista y no proceder sin ella:
- **Cuentas de IA con saldo real:** Anthropic (agente + estrategias + copy) y Gemini (imágenes) recargadas, con auto-reload y alertas de presupuesto. El agente y el marketing deben responder de punta a punta.
- **Dominio propio verificado:** para Resend (OTP + reportes a destinatarios reales) y para las URLs de producción. Hoy Resend está en sandbox — ver `docs/` y la memoria del bloqueador de Resend.
- **Meta Ads:** app de Meta creada, Business Verification hecha, App Review de `ads_management` APROBADO, OAuth y publicación de pauta probados end-to-end con una cuenta real.
- **Google Ads:** developer token aprobado, OAuth y publicación probados.
- **TikTok Ads:** app aprobada, OAuth y publicación probados. (Si TikTok se pospone al post-lanzamiento, decidirlo explícitamente y marcarlo en la landing como "en camino").
- **Segundo factor:** confirmado que "MFA = la 2FA de Google" es suficiente, o TOTP propio construido — ver la memoria de MFA.
- **Pagos:** Wompi en producción (no sandbox), verificación del comercio hecha, webhook validando firma, y el ciclo completo probado (comprar plan → acreditar créditos → renovar mes).
- **Multi-idioma:** AVENTHRA no puede salir a producción hasta estar traducida de verdad. Hoy el i18n (next-intl) solo cubre landing + login; el dashboard entero sigue en español fijo. Antes de desplegar: fase 2 de i18n completa (todo el panel extraído a `messages/es.json` / `messages/en.json` con paridad de claves y el toggle funcionando de punta a punta), y dejar el andamiaje listo para sumar más idiomas.
- **Crons de Vercel:** hay 2 (`vercel.json`, ambos `0 * * * *`) — `/api/cron/daily-reports` (reporte diario a medianoche local de cada país) y `/api/cron/reservation-reminders` (recordatorio de confirmación 1 día antes de cada reserva/turno). Solo corren en un deployment de producción en Vercel, nunca en local. Antes de dar por buenas estas features: (1) `CRON_SECRET` en las env vars del proyecto en Vercel, (2) plan **Vercel Pro** (Hobby: máx. 2 crons y corren máx. 1 vez/día, no puntual — no sirve), (3) probado end-to-end: llega el correo del reporte al admin a su medianoche local (queda en Superadmin → Envíos automáticos de reportes), y el recordatorio de reserva aparece en el hilo de conversación del cliente ~24 h antes. El envío saliente real del recordatorio depende del canal de WhatsApp (fase aparte).
- Todo "aprendido y configurado" — nadie despliega una integración que no entiende cómo opera ni cómo se corrige si falla.

## Nunca sin confirmación explícita
- Nunca modifiques contraseñas o credenciales de cuentas reales existentes sin pedir permiso primero, incluso para debugging. Si necesitas una cuenta de prueba, créala nueva — no reutilices ni sobrescribas una existente.

## Git — respaldo y disciplina de commits
 
- Al iniciar cualquier sesión, corre `git status --short` primero. Si hay más de ~10 archivos modificados/sin trackear que no correspondan a la tarea de hoy, avísame antes de seguir — probablemente significa que quedó trabajo de una sesión anterior sin comitear.
- No dejes acumular una sesión completa de trabajo sin comitear. Al terminar una feature o un fix coherente (no al terminar cada archivo individual), propón un commit: mensaje + lista de archivos, y espera mi aprobación antes de correrlo.
- Nunca hagas commit de algo que no puedas explicar en una frase. Si un commit mezcla cosas no relacionadas (ej. un fix de CSS junto con una feature nueva), sepáralos en commits distintos aunque sea más lento.
- Nunca hagas `git push`, `git push --force`, ni reescribas historial (`rebase`, `reset --hard` sobre commits ya hechos) sin que yo lo pida explícitamente en ese momento — no basta con que lo haya autorizado para una tarea anterior.
- Si detectas que llevamos mucho tiempo trabajando y no hemos comiteado nada, dilo tú proactivamente, no esperes a que yo pregunte.
## Seguridad — nunca dejar escapar credenciales
 
- Antes de cualquier commit, revisa que no se esté incluyendo ningún archivo de secretos: `.env`, `.env.local`, `.env*.local`, claves privadas, tokens. Confirma que `.gitignore` los cubre — si falta alguno, dímelo antes de comitear, no lo agregues al `.gitignore` y sigas de largo sin avisar.
- Si en algún momento escribes una contraseña, API key, o token real en la salida de la terminal (no en un archivo), trátalo como comprometido: dime explícitamente "esto quedó expuesto en la terminal" en vez de asumir que como no se guardó en un archivo, no importa.
- Nunca modifiques contraseñas o credenciales de cuentas reales existentes sin pedir permiso primero, incluso para debugging. Si necesitas una cuenta de prueba, créala nueva — no reutilices ni sobrescribas una existente.
- Cualquier script temporal que toque credenciales reales (rotación de contraseñas, tokens, etc.) debe: 1) mostrarme el código completo antes de ejecutarlo, 2) no imprimir secretos en la terminal salvo que yo lo autorice explícitamente para esa cuenta en particular, 3) borrarse a sí mismo al terminar y confirmarlo con `git status --short`.
- Antes de agregar una dependencia nueva, dime por qué es necesaria y confirma que no existe ya una forma de lograrlo con lo que el proyecto ya tiene instalado.
- Si encuentras un secreto ya expuesto en el historial de git (no solo en el working tree), avísame de inmediato y no intentes limpiarlo tú solo con reescritura de historial — eso lo decido yo, con cuidado, porque afecta a cualquiera que ya haya clonado el repo.