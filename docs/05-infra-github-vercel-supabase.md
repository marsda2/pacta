# 05 · Infraestructura: GitHub, Vercel, Supabase

## ¿Hace falta Vercel?
**Sí, salvo que `whop apps deploy` soporte nuestro stack** (ver 03-whop.md §2). Necesitamos:
- Una URL HTTPS pública y estable para los **webhooks de Whop** y los **callbacks de Terac**.
- Una URL para el **iframe de Whop** y para que los jueces abran la demo desde cualquier navegador.
- Funciones serverless para guardar las claves secretas fuera del cliente.

Expo Go en el móvil sirve para la cámara en vivo; la web en Vercel sirve para todo lo demás.

## 1. GitHub

```bash
git init
gh repo create pacta --private --source . --remote origin
git push -u origin main
```

- Ramas: `main` (lo que se demuestra) y ramas cortas `feat/<cosa>` con un PR cada una → preview de Vercel por PR.
- Commitear `.env.example`, **nunca** `.env*`. `.gitignore`: `node_modules`, `.expo`, `dist`, `.env*`, `.vercel`.
- Si se trabaja en equipo: cada persona en su carpeta (ver los roles en 06) para evitar conflictos.

## 2. Vercel

1. Importar el repo de GitHub en Vercel (o `vercel link` desde la CLI).
2. Configuración de build:
   - Build command: `npx expo export -p web`
   - Output directory: `dist`
   - Las funciones en `api/` se detectan solas (runtime Node).
3. `vercel.json`: rewrites para el SPA (todas las rutas que no sean `/api/*` → `index.html`) y `maxDuration` más alto para `/api/proofs` y `/api/admin/calibrate` (visión y evaluación tardan unos segundos).
4. Variables de entorno en Production y Preview (sección 4).
5. Dominio: `pacta.vercel.app` (o el que quede libre). **Fijarlo pronto**: Whop y Terac apuntan a él.

Se puede usar la integración MCP de Vercel de esta sesión para revisar despliegues y logs durante el día.

## 3. Supabase

1. Crear el proyecto "pacta" (región cercana; US East si el hackathon es en EE. UU.).
2. Ejecutar las migraciones de `supabase/migrations` con el esquema de 02-arquitectura.md.
3. Storage: bucket privado `proofs`; subida mediante URL firmada que genera `/api/proofs`.
4. RLS activado: lectura solo de las filas propias; las escrituras solo desde el servidor (service role).
5. Auth: **Whop**, con JWT del iframe u OAuth public + PKCE fuera del iframe. Supabase se usa como base de datos, no como proveedor de login. El usuario demo solo es opt-in para pruebas locales de API; producción exige identidad. Ver [COMO-FUNCIONA](../COMO-FUNCIONA.md).

## 4. Variables de entorno (`.env.example`)

```
# Cliente (públicas, se incluyen en el bundle)
EXPO_PUBLIC_API_URL=https://pacta.vercel.app
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Servidor (solo en Vercel)
SUPABASE_SERVICE_ROLE_KEY=
WHOP_API_KEY=
WHOP_APP_ID=
WHOP_COMPANY_ID=
WHOP_WEBHOOK_SECRET=
WHOP_STAKE_PRODUCT_ID=
WHOP_PASS_PLAN_ID=
ANTHROPIC_API_KEY=
TERAC_MCP_URL=
TERAC_API_KEY=
TERAC_WEBHOOK_SECRET=
DEMO_USER_ID=
# Solo API local, ignorado en Vercel/production; no abre la UI sin login
ALLOW_DEMO_USER=false
# Callbacks adicionales de OAuth, separados por comas; registrar con npm run whop:auth
WHOP_OAUTH_REDIRECT_URIS=
# Opcional: para una app confidential distinta; PACTA usa public + PKCE sin client secret
WHOP_CLIENT_SECRET=
```

## 5. Desarrollo local

Login de Whop preparado con `npm run whop:auth` (API key existente, sin copiar secretos). Callbacks web permitidos: localhost/127.0.0.1 en 8081 y 8082; nativo: `pacta://auth/callback`. Para el flujo OAuth nativo se necesita una compilación de desarrollo con el scheme `pacta` y el plugin de SecureStore, en lugar del enlace `exp://` de Expo Go.

`npm run dev:api` admite `PORT` (3000 por defecto). `EXPO_PUBLIC_API_URL` debe apuntar a esa API en desarrollo; la web publicada usa el mismo origen. La configuración OAuth real está guardada en Whop; **el código de sesión/bienvenida/perfil aún no se ha desplegado** en esta tarea. `npm run check:auth` verifica 27 casos sin cobros, con OAuth simulado y dos cuentas QA en Postgres borradas al terminar.
- `npx expo start` → abrir en Expo Go (cámara) y en el navegador.
- API local: `vercel dev` sirve `api/*` en localhost. Para los webhooks en local, usa la URL de una preview de Vercel en lugar de un túnel (menos piezas que se puedan romper).

## 6. Checklist de conexión (marca cada punto al hacerlo)
- [ ] Repo en GitHub conectado a Vercel; la primera build pasa
- [ ] Dominio fijo de Vercel
- [ ] Proyecto de Supabase + migraciones + bucket
- [ ] App de Whop creada, API key, URL del iframe → Vercel
- [ ] Webhook de Whop registrado y probado con un pago pequeño (y un reembolso, para ver si devuelve la comisión)
- [ ] Credenciales de Terac + una tarea de prueba creada y leída
- [ ] Clave de Anthropic + una llamada de visión de prueba
- [ ] Todas las variables en Vercel (Production y Preview)
