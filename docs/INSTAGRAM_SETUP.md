# Guía: conectar la publicación automática en Instagram

El sistema publica con la **API oficial de Instagram**. Solo necesitas dos
secrets en GitHub: `IG_USER_ID` e `IG_ACCESS_TOKEN`. Esta guía usa el flujo
nuevo de Meta (**"API de Instagram con inicio de sesión de Instagram"**), que
es el más simple: **no necesita página de Facebook**.

## Paso 0 — Requisitos

- Tu cuenta de Instagram debe ser **profesional** (Creator o Business).
  En la app de Instagram: *Configuración → Tipo de cuenta y herramientas →
  Cambiar a cuenta profesional*. Es gratis y reversible.
- Una cuenta personal de Facebook para entrar a Meta for Developers.

## Paso 1 — Entrar a Meta for Developers (soluciones a fallos de login)

Entra en <https://developers.facebook.com> con tu cuenta de Facebook normal.
Si el login falla:

1. **Activa la verificación en dos pasos (2FA)** en tu cuenta de Facebook:
   <https://accountscenter.facebook.com> → *Contraseña y seguridad* →
   *Autenticación en dos pasos*. Meta la exige para developers y sin ella el
   login puede fallar sin explicación.
2. Verifica **teléfono y email** en la cuenta de Facebook.
3. Borra cookies de `facebook.com` o usa **ventana de incógnito**, sin VPN ni
   bloqueadores de anuncios.
4. Si el botón de registro no reacciona, usa el registro directo:
   <https://developers.facebook.com/async/registration>
5. Cuentas de Facebook muy nuevas pueden estar bloqueadas para registrarse
   como developer durante unos días — verifica el teléfono y reintenta.

## Paso 2 — Crear la app

1. *My Apps → Create App*.
2. Caso de uso: **"Other"** → tipo de app: **Business** → crear.

## Paso 3 — Añadir el producto Instagram y generar el token

1. En el dashboard de la app: *Add product* → **Instagram** → *Set up*.
2. Elige **"API setup with Instagram login"**.
3. En **"Generate access tokens"**: pulsa *Add account*, inicia sesión con tu
   cuenta de Instagram profesional y autoriza.
4. Pulsa **Generate token** junto a la cuenta. Copia el token (empieza por
   `IGAA…`). Es un token de **larga duración (60 días)**.
5. Ahí mismo aparece el **Instagram user ID** numérico de la cuenta
   (si no, obtén el ID con:
   `curl "https://graph.instagram.com/v23.0/me?fields=user_id,username&access_token=TU_TOKEN"`).

Permisos que debe incluir el token: `instagram_business_basic` y
`instagram_business_content_publish` (el flujo de arriba los incluye).

## Paso 4 — Configurar los secrets en GitHub

En <https://github.com/danilomonge/LDU_auto> → *Settings → Secrets and
variables → Actions → New repository secret*:

| Secret | Valor |
| --- | --- |
| `IG_USER_ID` | el ID numérico del paso 3 |
| `IG_ACCESS_TOKEN` | el token `IGAA…` del paso 3 |

Listo. En el siguiente run (máx. 30 min, o lánzalo manualmente en *Actions →
LDU Instagram posts → Run workflow*) se publicarán los posts en cola y todos
los futuros.

## Renovar el token (cada ~60 días)

Los tokens `IGAA…` caducan a los 60 días. Renovación con un curl (devuelve un
token nuevo de 60 días; actualiza el secret):

```bash
curl "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=TU_TOKEN_ACTUAL"
```

Solo funciona con tokens que tengan al menos 24 h de antigüedad y aún no
hayan caducado. Si caducó, repite el paso 3 (un minuto).

## Alternativa: flujo clásico con página de Facebook (Graph API Explorer)

Si tu Instagram está vinculado a una página de Facebook:

1. Abre el [Graph API Explorer](https://developers.facebook.com/tools/explorer),
   selecciona tu app.
2. En *Permissions* añade **todas** estas: `instagram_basic`,
   `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`,
   `business_management`.
3. *Generate Access Token* → autoriza. Esto da un **token de usuario de corta
   duración (~1-2 h)** — no lo uses directamente como secret.
4. Cámbialo por uno de **larga duración (60 días)** (App ID y App Secret están
   en *App settings → Basic*):

   ```bash
   curl "https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=TOKEN_CORTO"
   ```

5. (Opcional, recomendado) Con ese token largo pide el **token de página, que
   no caduca nunca**:

   ```bash
   curl "https://graph.facebook.com/v23.0/me/accounts?fields=name,access_token&access_token=TOKEN_LARGO"
   ```

   Usa el `access_token` de tu página como `IG_ACCESS_TOKEN` permanente.
6. El `IG_USER_ID` es el id de `instagram_business_account` (no el id de la
   página): el workflow **"Instagram credentials diagnostic"** (pestaña
   Actions) lo imprime una vez configurado el token.

El sistema detecta el tipo de token automáticamente (`EAA…` →
`graph.facebook.com`, `IGAA…` → `graph.instagram.com`).

## Diagnóstico

Con los secrets puestos, corre el workflow **Instagram credentials
diagnostic** (Actions → Run workflow). Imprime el tipo de token, sus permisos
reales, su fecha de caducidad, y el `IG_USER_ID` correcto de cada página.

## Errores comunes al publicar

- **"Media posted before business account conversion"** → la cuenta no es
  profesional. Conviértela (Paso 0) y regenera el token.
- **"Invalid image URL" / imagen no descargable** → el repo debe ser público
  (Instagram descarga la imagen desde `raw.githubusercontent.com`).
- **Error 190 (token expirado)** → renueva el token (sección anterior).
