<!-- BEGIN:nextjs-agent-rules -->
# Este NO es el Next.js que conoces

Esta versión tiene cambios incompatibles — APIs, convenciones y estructura de archivos pueden diferir de tus datos de entrenamiento. Lee la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código. Presta atención a los avisos de deprecación.
<!-- END:nextjs-agent-rules -->

# Big Gama Admin

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4/shadcn. MongoDB (Mongoose) guarda usuarios/viajes, Google Distance Matrix calcula rutas y Google Sheets es el registro que ve el conductor. Todos los textos de interfaz y errores de API están en español.

## Comandos

- Dev: `npm run dev` (http://localhost:3000)
- Typecheck: `npx tsc --noEmit`
- Build: `NODE_OPTIONS=--max-old-space-size=4096 npm run build` — con el heap por defecto, Node se queda sin memoria en este entorno.
- Lint: `npm run lint` ejecuta ESLint sobre todo el repo y **no está limpio** (errores preexistentes de `no-explicit-any` y react-hooks en páginas de UI). Revisa solo los archivos tocados con `npx eslint <rutas>`.
- No existe runner de tests, script de test ni archivos de test. No inventes uno; verifica con typecheck, ESLint dirigido, build y una prueba manual del flujo.
- Seed (opcional): `npx --yes tsx seed.ts` (`tsx` no es dependencia del proyecto). Requiere `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DRIVER_EMAIL` y `SEED_DRIVER_PASSWORD` (contraseñas de 8+ caracteres). `seed.ts` carga `.env` con `dotenv/config`, NO `.env.local`, y solo crea emails que no existan — nunca restablece la contraseña de un usuario existente.
- `next-env.d.ts` es generado; alterna entre `.next/dev/types` y `.next/types` según se use dev o build. No subas ese cambio.

## Entorno

- Next carga `.env.local` por encima de `.env`; ambos archivos existen y duplican `MONGODB_URI`/`JWT_SECRET`, así que mantenlos sincronizados.
- Obligatorias: `MONGODB_URI` y `JWT_SECRET` (mínimo 32 caracteres, validado en `src/lib/auth.ts`).
- Google: `GOOGLE_MAPS_API_KEY` (Distance Matrix en servidor), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (autocomplete de Places en cliente), `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEETS_DEFAULT_ID`.
- Si Mongo falla con `querySrv ENOTFOUND`, el host de Atlas configurado está obsoleto/eliminado (NXDOMAIN); no es un problema de credenciales ni de allowlist de IP. Para desarrollo local usa `mongodb://127.0.0.1:27017/big_gama_admin`.
- `.env*` y `client_secret_*.json` están en `.gitignore`; nunca subas secretos.

## Arquitectura

- Route groups: `src/app/(admin)` para ADMIN, `src/app/(auth)` para login y `src/app/driver` para CONDUCTOR. `middleware.ts` protege las páginas según la cookie `token`. `/api/*` queda fuera del middleware y se autentica por su cuenta.
- Auth: `POST /api/auth/login` define una cookie `token` HttpOnly con JWT (HS256, iss `big-gama-admin`, aud `big-gama-admin-web`, 24h) y devuelve el usuario. El middleware la verifica con `jose`. Las rutas de API aceptan la cookie o un Bearer token; `authenticateRequest` relee el usuario desde Mongo y exige `isActive` y el rol actual. `POST /api/auth/logout` borra la cookie.
- Las rutas de API viven en `src/app/api/*`; usa siempre `requireRole()` de `src/lib/middleware-helpers.ts`. Solo ADMIN: `/api/users*`, `/api/trips/stats`, `/api/sheets/link`. Las consultas de viajes de un CONDUCTOR se fuerzan a su propio `userId`.
- Los modelos están en `src/lib/models/{user,trip,route-cache}.ts`; la conexión a Mongo se cachea en `src/lib/mongodb.ts`.
- Flujo de un viaje (`POST /api/trips`): Distance Matrix (`src/lib/google-maps.ts`) -> `RouteCache` indexado por direcciones normalizadas + dayType + bucket de 2h (`src/lib/route-calc.ts`, `src/lib/time-bucket.ts`) -> marca alerta si supera `ALERT_MAX_KM`/`ALERT_MAX_HOURS` -> guarda `Trip` -> agrega la fila a la pestaña del conductor con reintentos (`src/lib/queue.ts`, `src/lib/google-sheets.ts`).
- Cada conductor tiene su propia pestaña; `spreadsheetRow`/`spreadsheetTab` se persisten para sincronizar ediciones y borrados. Las celdas que empiezan con `= + - @` se escapan antes de `USER_ENTERED`.
- Valida los cuerpos de las peticiones con los esquemas zod de `src/lib/validation.ts`; el `limit` de paginación está topado en 100. Agrega nuevos esquemas ahí y usa `runValidators: true` en las actualizaciones de Mongoose.
- Las páginas son client components que hacen `fetch` a rutas del mismo origen usando `NEXT_PUBLIC_API_URL || ''`. Asume autenticación por cookie en el mismo origen.
- `src/lib/rate-limit.ts` es solo en memoria (por proceso/instancia); no se comparte entre instancias serverless.
- El estilo de shadcn es `base-nova`, Tailwind v4 no tiene `tailwind.config`, los componentes de UI viven en `src/components/ui` y el alias `@/*` apunta a `./src/*`.
- No hay registro público. Un ADMIN crea conductores con `POST /api/users` (UI `/users`) y los activa con `PATCH /api/users/[id]/approve`.
