# Checklist — registrar AVENTHRA como empresa real

> **Para hacer antes de producción.** Esto es lo que bloquea, al mismo
> tiempo: Wompi en modo producción, la Verificación de negocio de Meta
> (Sección F de `docs/meta-corporate-setup.md`), y cualquier trámite
> similar en Google Ads / TikTok Ads. Un solo trámite (constituir la
> empresa) desbloquea todo lo demás en cadena.
>
> No soy abogado ni contador — la decisión de estructura legal
> (persona natural vs. SAS) confírmala con un contador en Colombia antes
> de radicar nada. Aquí te dejo las implicaciones para que sepas qué
> preguntarle.

---

## 0. La decisión que define todo lo demás

¿AVENTHRA opera como **persona natural con RUT** (tú mismo, Yhojan Andres
Caro Gonzalez, facturando a tu nombre) o como **persona jurídica (SAS)**
(una empresa nueva, separada de ti)?

| | Persona natural | SAS (Sociedad por Acciones Simplificada) |
|---|---|---|
| Velocidad | Más rápido — un trámite (RUT) en la DIAN | Más lento — constitución + RUT + matrícula mercantil |
| Costo inicial | Bajo | Matrícula mercantil + posible notaría si no se hace 100% virtual |
| Responsabilidad | Ilimitada — respondes con tu patrimonio personal | Limitada al capital de la sociedad |
| Percepción ante Meta/Wompi/bancos | Válida, pero algunos formularios piden "razón social" que no aplica igual | Más "institucional"; facilita cuentas bancarias empresariales y crecer con socios/inversión después |
| Impuestos | Declaras como persona natural (régimen que te asigne la DIAN) | Declaración de renta de la sociedad, aparte de la tuya personal |

Para un SaaS que planea cobrar suscripciones recurrentes, contratar
después, o eventualmente buscar inversión, la SAS es lo más común en
Colombia — pero **confírmalo con un contador**, porque depende de tus
ingresos proyectados y tu situación tributaria personal.

## 1. Trámites base (aplican para cualquiera de las dos opciones)

- [ ] **Definir la estructura legal** (ver sección 0) — con un contador.
- [ ] **Nombre y verificación de homonimia**: confirmar en el RUES
      (rues.org.co) que "AVENTHRA" (o el nombre legal que uses) no está
      ya registrado por otra empresa en Colombia.
- [ ] **Si es SAS**: redactar y radicar los estatutos (puede hacerse
      100% en línea vía la Cámara de Comercio de tu ciudad, sin notaría,
      si el capital y los términos son simples — pregúntale a la Cámara
      de Comercio local, ej. Cámara de Comercio de Medellín).
- [ ] **Matrícula mercantil** en la Cámara de Comercio de tu ciudad —
      esto te da el **Certificado de Existencia y Representación Legal**
      (si es SAS) o el **Certificado de Matrícula Mercantil** (si es
      persona natural con establecimiento de comercio). Este certificado
      es el documento que más te van a pedir después (Wompi, bancos,
      a veces Meta).
- [ ] **RUT (Registro Único Tributario)** ante la DIAN — se tramita en
      línea (dian.gov.co) una vez tengas la matrícula mercantil. Este
      es el documento que identifica fiscalmente al negocio (el
      "número de la empresa" que mencionas).
- [ ] **Renovar la matrícula mercantil cada año** (antes del 31 de
      marzo) — no es de una sola vez, es un trámite anual.
- [ ] **Cuenta bancaria a nombre del negocio** (no tu cuenta personal) —
      la piden el banco con: RUT, certificado de Cámara de Comercio,
      cédula del representante legal (tú). Esto es lo que después
      conecta con Wompi para que te paguen a ti, no a AVENTHRA.

## 2. Lo que específicamente pide Wompi para pasar a producción

Wompi (de Bancolombia) valida el comercio antes de dejarte cobrar en modo
real. Documentos típicos que solicitan:

- [ ] RUT actualizado (no de hace años, reciente)
- [ ] Certificado de Cámara de Comercio (si es persona jurídica) o
      cédula (si es persona natural)
- [ ] Cuenta bancaria a nombre del RUT que declaraste
- [ ] Datos de contacto reales del negocio (dirección, teléfono, correo
      en el dominio propio — no un Gmail genérico, si se puede)
- [ ] URL del sitio con **Términos y condiciones** y **Política de
      tratamiento de datos** visibles (ya deberíamos tener `/terminos`
      y `/privacidad` construidos para AVENTHRA — verificar que sigan
      publicados cuando cambie el dominio final)
- [ ] Descripción clara de qué vende AVENTHRA (suscripción SaaS) — para
      que el comercio quede bien categorizado
- Ver también `docs/setup-credits-payments.md` si ya hay notas previas
  de la integración técnica de Wompi.

## 3. Lo que específicamente pide Meta (Business Verification)

Ya está detallado en `docs/meta-corporate-setup.md` Sección F, resumen
de los documentos que piden ahí:

- [ ] Documento legal que pruebe que el negocio existe: **Certificado de
      Cámara de Comercio** o **RUT** (Meta acepta cualquiera de los dos
      generalmente, a veces pide ambos)
- [ ] Dirección física del negocio (coincidente con la del RUT/Cámara)
- [ ] Número de teléfono del negocio verificable
- [ ] Sitio web con el **mismo nombre legal** y dominio verificado en el
      portafolio de Meta
- [ ] Correo corporativo en el dominio propio (ej. `contacto@aventhra...`,
      no un Gmail) — refuerza la verificación
- Tarda **semanas** — es el cuello de botella real, por eso conviene
  radicarlo apenas exista el RUT/Cámara de Comercio, no esperar a tener
  todo lo demás listo.

## 4. Google Ads / TikTok Ads

- [ ] **Google Ads Manager (MCC)**: no pide verificación legal tan
      estricta para empezar a anunciar, pero el **developer token** de
      la API sí pide describir el caso de uso real (que es exactamente
      lo que hace AVENTHRA: gestionar pauta de terceros) — tener el RUT
      y el sitio web ya ayuda a que la aplicación se vea legítima.
- [ ] **TikTok for Business developer account**: pide verificación de
      negocio similar a Meta (documento legal + sitio web + a veces
      video de demostración del flujo).

## 5. Dominio y correo corporativo

- [ ] Registrar el dominio definitivo de AVENTHRA (si no está hecho ya)
      a nombre del negocio, no de una persona — facilita after que Meta/
      Wompi/bancos verifiquen que coincide con el RUT.
- [ ] Correo corporativo en ese dominio (ej. Google Workspace o similar)
      — lo vas a necesitar para: Resend (ya resuelto), Meta Business
      Verification, Wompi, y cualquier cuenta de developer.
- ⚠️ Recuerda la nota ya existente en `CLAUDE.md`: si el dominio cambia,
  hay que rehacer varias integraciones (`NEXT_PUBLIC_APP_URL`, Resend,
  redirect URIs de OAuth, webhooks). Regístralo definitivo antes de
  arrancar estos trámites para no duplicar trabajo.

## 6. Orden recomendado (para no perder tiempo)

1. **Decidir estructura legal** con un contador (persona natural vs SAS).
2. **Registrar el dominio definitivo** (si no existe ya) — todo lo
   demás depende de tener un dominio y correo estables.
3. **Matrícula mercantil** en la Cámara de Comercio → te da el
   certificado.
4. **RUT** en la DIAN (necesita la matrícula mercantil hecha).
5. **Cuenta bancaria empresarial** (necesita RUT + certificado).
6. En paralelo, apenas tengas RUT + certificado: **radicar Business
   Verification de Meta** (es lo que más tarda — arráncalo ya) y
   **actualizar el perfil de comercio de Wompi** a producción.
7. Google Ads / TikTok Ads developer accounts — cuando tengas tiempo,
   no son tan urgentes como Meta.

## Control de cambios

| Versión | Fecha | Descripción | Responsable |
|---|---|---|---|
| 1.0 | 2026-09-04 | Primera versión del checklist. | Yhojan Caro (con Claude Code) |
