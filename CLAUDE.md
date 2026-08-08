@AGENTS.md

## Notas específicas de Claude Code

- Antes de tocar RLS o políticas de Supabase, explica el cambio y espera confirmación.
- Nunca uses la service role key fuera de server actions marcados "use server".
- Al crear una página nueva bajo app/(dashboard)/, sigue el patrón ya existente: layout.tsx valida rol y mustChangePassword, page.tsx hace la consulta de datos.

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