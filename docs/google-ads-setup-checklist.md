# Checklist — conectar Google Ads a AVENTHRA

Mismo espíritu que `docs/meta-corporate-setup.md`: esto es 100% trámite tuyo en las
consolas de Google, no algo que yo pueda hacer por ti. Cuando tengas cada dato, me lo
pasas y yo lo dejo configurado en el código.

**Ojo:** el Google OAuth que ya usa AVENTHRA (el botón "Continuar con Google" del login)
es un proyecto/credencial **distinto** — lo administra Supabase, y su scope es solo
identidad, no anuncios. Para Google Ads hace falta un client OAuth propio, con el scope
`adwords`.

---

## A. Google Cloud — proyecto + API + credenciales OAuth

1. ✅ **Hecho** — Entra a [console.cloud.google.com](https://console.cloud.google.com).
   Proyecto creado (o reusado).
2. ✅ **Hecho** — **APIs & Services → Library** → **"Google Ads API"** → **Enable**.
3. ⬜ **Siguiente paso** — Configurar el consentimiento OAuth. Google le cambió el nombre
   a esto: ya no se llama solo "OAuth consent screen", ahora puede vivir bajo
   **"Google Auth Platform"** (menú ☰ de la izquierda) o dentro de **APIs & Services →
   OAuth consent screen / Branding**. Si al entrar te sale una pantalla pidiendo crear la
   "marca" (nombre de la app, correo de soporte), es ahí — llénala primero.

   Una vez dentro:
   - Tipo: **External**.
   - Nombre de la app, correo de soporte, logo (opcional).
   - En **Scopes**, agrega `https://www.googleapis.com/auth/adwords`.
   - En **Test users**, agrega tu propio correo de Google (el que administra la cuenta de
     Google Ads) — mientras la app esté en modo "Testing" (no publicada), solo los
     correos de esta lista pueden completar el login. Es suficiente para construir y
     probar; no hace falta publicarla ni pedirle verificación a Google todavía.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Tipo de aplicación: **Web application**.
   - Nombre: "Aventhra — Google Ads".
   - **Authorized redirect URIs**, agrega EXACTO:
     ```
     https://TU-DOMINIO/api/auth/google-ads/callback
     ```
     (en desarrollo local, agrega también `http://localhost:3000/api/auth/google-ads/callback`
     — Google sí acepta `localhost`, a diferencia de Instagram).
   - Al crear, Google te muestra el **Client ID** y el **Client Secret** — guárdalos, los
     necesito.

---

## B. Google Ads — cuenta Manager (MCC) + Developer Token

5. Entra a [ads.google.com/home/tools/manager-accounts](https://ads.google.com/home/tools/manager-accounts)
   y crea una cuenta **Manager (MCC)** si no tienes una — es la cuenta "paraguas" desde
   la que se administra el developer token y, más adelante, las cuentas de los negocios
   que conecten Google Ads.
6. Dentro de esa cuenta Manager: **Tools & Settings (llave inglesa) → Setup → API
   Center**.
7. Solicita el **Developer Token**. Apenas lo pides, Google te da automáticamente
   **acceso de nivel "Test accounts"** — con eso ya podemos construir y probar el código
   de punta a punta, pero SOLO contra cuentas de Google Ads de prueba (sin gasto real, sin
   llegar a clientes reales).
8. En el mismo API Center hay un botón para **solicitar acceso Basic** (el que sí
   funciona con cuentas reales de tus clientes). Ahí Google pide una descripción de cómo
   vas a usar la API — algo como: *"Aventhra es una plataforma SaaS donde cada negocio
   conecta su propia cuenta de Google Ads para publicar sus propias campañas."* Esto lo
   revisa una persona de Google — no hay fecha garantizada, cuenta con que puede tardar
   de unos días a un par de semanas.

---

## C. Lo que me pasas cuando lo tengas

No hace falta esperar a que todo esté listo — con lo de la sección A + el developer token
de nivel "Test accounts" (paso 7) ya puedo dejar la conexión funcionando en modo prueba:

- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- El **Customer ID de tu cuenta Manager** (formato `123-456-7890`, aparece arriba a la
  derecha cuando entras a la cuenta MCC).

Con eso configuro las variables de entorno y construyo/pruebo el botón "Conectar" de
Google Ads en Marketing → Conexiones, igual que ya funciona con Meta.

**Aparte, pendiente de decidir más adelante (no bloquea nada de lo de arriba):** qué tipo
de campaña de Google crear cuando se publique de verdad — Google no tiene un equivalente
directo a "Click-to-Messenger" de Meta. Lo hablamos cuando estemos más cerca del acceso
Basic.
