# Verificación del Proyecto — MVP Reservas Condominio

**Fecha de revisión:** 2026-09-16
**Revisor:** Muse Spark (agente)
**Commit revisado:** `15e9202` (rama `main`, árbol limpio salvo `playwright-report/index.html` regenerado por los tests)
**Alcance:** revisión estática completa del código en `src/` + ejecución real de typecheck, lint, build y suite Playwright. **No** incluye pruebas manuales en navegador con usuarios reales ni verificación contra la BD remota de Supabase (ver §5).

---

## 1. Reglas del proyecto (RULES.md)

- **No existe `.continue/rules/`** en el repo (verificado con búsqueda de archivos). El equivalente vigente es **`RULES.md`** en la raíz, y toda esta revisión se contrastó contra ese archivo.
- **Stack declarado vs. real:**

| Regla (RULES.md) | Estado real | Cumple |
|---|---|---|
| Next.js 14+ App Router | `next 16.3.5` en `package.json` (más nuevo que "14+") | ✅ |
| TypeScript strict | `strict: true` en `tsconfig.json`, `tsc --noEmit` limpio | ✅ |
| Tailwind + shadcn/ui | Tailwind v4 + componentes estilo shadcn en `src/components/ui/` | ✅ con notas (§3.4) |
| Supabase (PostgreSQL + Auth) | `@supabase/ssr` + `@supabase/supabase-js`, clientes server/client separados | ✅ |
| Zod + React Hook Form | Ambos en uso en auth/perfil | ✅ |
| ESLint + Prettier + Husky | ESLint sí; **Prettier y Husky NO están instalados** (no aparecen en `package.json`) | ❌ |
| Deploy Vercel | Desplegado (URL de producción configurada) | ✅ (no verificado por mí en esta revisión) |
| Sentry (fase 2) | **No instalado** | ⚠️ pendiente documentado (Fase 3) |
| Testing Playwright E2E | Suite existe, 7/7 pasan (§2) | ✅ parcial (solo smoke tests) |
| Notificaciones Resend + Cron | Implementado en código; cron no verificado end-to-end (§3.3) | ⚠️ |

- **Brechas contra el checklist pre-merge de RULES.md:**
  - ❌ `pnpm lint` **FALLA** (11 errores, 44 warnings — detalle en §2.2).
  - ❌ Regla "API Routes para mutaciones (usar Server Actions)": existen `src/app/admin/actions/*/route.ts` y `src/app/api/reservations/create/route.ts`. Son envoltorios delgados sobre Server Actions, pero formalmente **son API Routes que ejecutan mutaciones**.
  - ❌ Regla "Sin `console.log` de debug": hay `console.error`/`console.warn` en `src/lib/emails.ts` y `src/app/api/cron/reminders/route.ts` (aceptables como logging de errores, pero existen).
  - ⚠️ `package.json` aún dice `"name": "tmp-next"` (nombre del scaffold, sin renombrar).

---

## 2. Resultados de pruebas (ejecutadas hoy, 2026-09-16)

### 2.1 Typecheck — ✅ PASA
```
pnpm exec tsc --noEmit
(salida vacía, exit 0)
```

### 2.2 Lint — ❌ FALLA
```
pnpm lint
✖ 55 problems (11 errors, 44 warnings) — exit 1
```
**11 errores** (todos `no-empty-object-type`):
- `src/components/forms/form.tsx` (7×: líneas 9, 15, 24, 33, 42, 51, 65 — interfaces `Form*Props` vacías)
- `src/components/ui/input.tsx:4`, `src/components/ui/label.tsx:4`, `src/components/ui/textarea.tsx:6` (mismo patrón)
- `src/app/admin/schedules/page.tsx:94` — `react-hooks/set-state-in-effect` (llamada a `fetchData()` con `setState` síncrono dentro de `useEffect`)

**44 warnings** (selección):
- Imports no usados: `Label` en login/register/profile; `FormDescription` en login; `router` en profile; `redirect` en `reservations/actions.ts`; `Input`/`isBefore` en `new/page.tsx`; `CardHeader`/`CardTitle`/`Loader2` en `reservations/page.tsx`; `DialogTrigger`/`Clock` en admin areas/schedules; `Loader2`/`MoreHorizontal` en admin page/reservations; `Input` en admin users; `CheckCircle`/`XCircle`/`Loader2`/`ArrowLeft`/`isWithinInterval`/`todayReservations` en security/page; iconos sin usar en los 3 layouts.
- `window.location.href` para navegación interna en los 3 layouts (dashboard/admin/security, línea 52).
- `react-hooks/exhaustive-deps` en `new/page.tsx` y `schedules/page.tsx` (`fetchData`/`supabase` fuera del array de deps).
- Variables declaradas sin uso en `calendar.tsx` (`isUnavailableDate`, `rest`, `isDisabledDay`, `isSelected`, `isRangeStart/End/Middle`).

### 2.3 Build — ✅ PASA
```
pnpm build
✓ Compiled successfully · TypeScript OK · 21/21 páginas generadas
Rutas: / /login /register /dashboard* /admin* /security /api/*
```

### 2.4 Playwright E2E — ✅ 7/7 PASAN
```
npx playwright test
Running 7 tests using 6 workers
7 passed (9.8s)
```
Detalle (`tests/e2e-flow.spec.ts`): carga de login y register; redirects a login desde `/dashboard`, `/admin`, `/security`, `/dashboard/reservations/new`, `/dashboard/profile`. **Cobertura honesta: solo smoke tests de protección de rutas y render. NO cubren ningún flujo feliz** (registro→login→reserva→aprobación→check-in). No existen unit tests (Vitest) pese a que RULES.md los exige con coverage 70%.

---

## 3. Problemas encontrados (revisión archivo por archivo)

### 3.1 🔴 CRÍTICO — `escapeHtml` en `src/lib/emails.ts:14-21` es un no-op: el XSS de `adminNotes` SIGUE ABIERTO
El commit `15e9202` ("fix: XSS prevention") **no corrige nada**. Leído hoy el archivo, la función es:
```ts
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&")    // & → &  (no hace nada, debería ser &amp;)
    .replace(/</g, "<")    // < → <  (no hace nada, debería ser &lt;)
    .replace(/>/g, ">")    // > → >  (no hace nada, debería ser &gt;)
    .replace(/"/g, "\"")   // " → "  (no hace nada, debería ser &quot;)
    .replace(/'/g, "&#039;");  // único reemplazo real
}
```
Los call sites (`reservationApprovedEmail` ~línea 162, `reservationRejectedEmail` ~línea 231) llaman a `escapeHtml(adminNotes)`, pero como la función no transforma nada, un `admin_notes` con `<script>` / `<img onerror=...>` **llega intacto al HTML del correo**. El hallazgo de David sigue explotable. Además, `userName` y `areaName` se interpolan sin escapar en los 4 templates (misma clase de problema, menor severidad: `full_name` lo escribe el propio usuario, `areaName` lo escribe un admin).

### 3.2 🔴 Botón "cancelar reserva" roto — `src/app/(dashboard)/dashboard/reservations/page.tsx:30-40,101-110`
La página es un **Server Component** (`async`, sin `"use client"`) que define `cancelReservation` dentro del componente y la pasa a `onClick`. Las funciones de servidor no pueden usarse como manejadores de eventos del cliente: el botón de papelera **no funciona en runtime**. Existe además código muerto duplicado: `cancelReservationAction` en `src/app/(dashboard)/dashboard/reservations/actions.ts:247-263` no se importa en ningún lado. El build y `tsc` no lo detectan; **no lo probé en navegador**, pero por construcción de Next.js este botón está roto.

### 3.3 🔴 Panel seguridad: acciones sin `"use server"` y cron sin service-role (no verificado end-to-end)
- `src/app/security/page.tsx:246-277`: `checkIn`/`checkOut`/`markNoShow` son funciones `async` planas al final de un Server Component, usadas en `onClick` (líneas 186, 193, 201). No tienen `"use server"`: **probablemente rotas en runtime igual que §3.2**. No lo verifiqué en navegador (ver §5).
- `src/app/api/cron/reminders/route.ts:18`: usa `createClient()` (cliente con cookies de usuario y anon key). Un cron de Vercel **no lleva cookies de sesión**, así que bajo RLS la consulta devolverá 0 filas y el endpoint siempre responderá "No reminders to send". No existe helper de cliente con `SUPABASE_SERVICE_ROLE_KEY` (la key existe en `.env.local`, pero nada en `src/` la usa). **Recordatorios 24h muy probablemente no funcionan en producción** (no verificado end-to-end).

### 3.4 🟡 Inconsistencias con RULES.md (estilo/stack)
- CSS custom fuera de Tailwind en `src/app/globals.css` (`glass`, `gradient-primary`, `text-gradient`, `shadow-soft/card`, keyframes): RULES permite excepción solo para `globals.css`, así que es formalmente válido, pero es CSS custom sustancial.
- Spinner SVG inline en `login/page.tsx:157` en vez de `Loader2` de `lucide-react` (RULES: "Iconos: lucide-react únicamente").
- `package.json`: `name` sigue siendo `"tmp-next"`; faltan scripts `typecheck`/`test` aunque el checklist los exige; sin Prettier/Husky.
- API Routes que ejecutan mutaciones (`admin/actions/*`, `api/reservations/create`) contradicen la regla; son envoltorios finos, documentarlo o mover a Server Actions puras.
- `next.config.ts` / middleware: Next 16 advierte que la convención `middleware.ts` está deprecada en favor de `proxy` (solo warning, funciona).

### 3.5 🟡 Lógica y dead code
- `security/page.tsx:18`: `todayReservations` se consulta y **nunca se usa** (solo se usa `activeReservations`).
- `dashboard/page.tsx:79`: tarjeta "Total histórico" cuenta solo las últimas 5 reservas (`limit(5)`), etiqueta engañosa.
- `reservations/page.tsx:80`: construye color con `config?.color.split(...).replace(...)` en un `style` — frágil; además `statusConfig` no incluye `no_show`.
- Admin `users/page.tsx`: botones Buscar/Invitar/Cambiar rol/Eliminar sin handlers (placeholders). Admin `reservations/page.tsx`: botones Filtros/Exportar CSV sin handlers. (Ya registrado en FEATURES.md como pendiente.)
- `new/page.tsx`: cliente Supabase creado en render; `useEffect` con `fetchData` fuera de deps (warning); chequeo de disponibilidad cliente + validación servidor duplicada (aceptable, pero hay doble fuente).
- `admin/actions/*/route.ts`: mezclan `return new Response(...)` en error con `redirect()` (que lanza) en éxito — funciona, pero inconsistente.
- `admin/areas/page.tsx`, `admin/schedules/page.tsx`: `formState` es objeto plano mutado con `Object.assign` fuera de `useState` — funciona pero propenso a renders perdidos; `DialogTrigger` importado sin usar.

### 3.6 🟢 Seguridad BD (verificado solo en código/SQL local, no en dashboard remoto)
- Trigger `handle_new_user` en `schema.sql`/`migration_fix_trigger.sql` guarda `apartment/phone/role` con default `resident`. **No verifiqué que la función desplegada en Supabase sea esta versión** (requiere revisar Functions en dashboard).
- Policies con `auth.jwt() ->> 'role'` para admin/security evitan la recursión reportada por David. **No verifiqué las policies desplegadas** (requiere SQL Editor).
- `.env.local` existe localmente con `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY`; **no está trackeado en git** (verificado: `git ls-files | grep .env` vacío). No puedo confirmar que nunca se haya filtrado fuera del repo.
- Middleware solo verifica autenticación, no roles (el control de rol vive en layouts + RLS): diseño aceptado, documentado aquí.

---

## 4. Recomendaciones antes del release (ordenadas por prioridad)

1. **🔴 Reescribir `escapeHtml` con entidades reales** (`&amp;` `&lt;` `&gt;` `&quot;` `&#039;`) y aplicar también a `userName`/`areaName` en los 4 templates de `src/lib/emails.ts`. Re-build + re-deploy + re-test. **El fix actual es cosmético.**
2. **🔴 Arreglar cancelación de reserva**: mover `cancelReservation` a Server Action con `"use server"` (reutilizar `cancelReservationAction` existente) y llamarla desde un Client Component o `<form action>`.
2. **🔴 Arreglar check-in/out/no-show** en `security/page.tsx`: mismas opciones (Server Actions con `"use server"` + verificación de rol `security`).
3. **🔴 Cron de recordatorios**: crear helper de cliente Supabase con service-role key (solo server, nunca exponer) y usarlo en `api/cron/reminders/route.ts`; probar con `CRON_SECRET` real.
4. **🟡 Dejar `pnpm lint` en verde**: o corregir los 11 errores + 44 warnings, o ajustar la config con justificación documentada. Hoy viola el checklist de RULES.md.
5. **🟡 Verificar en Supabase Dashboard** (no hecho en esta revisión): función `handle_new_user` desplegada, policies `profiles`/`reservations`/`schedules` desplegadas, rate limit de emails ≥ 10/hora.
6. **🟡 Completar Prettier + Husky** (exigidos por RULES.md) o actualizar RULES.md si se decide no usarlos. Renombrar `package.json` (`tmp-next` → nombre real) y agregar scripts `typecheck`/`test`.
7. **🟢 Tests**: ampliar Playwright a 1 flujo feliz completo (registro→reserva→aprobación) con usuario de prueba dedicado; agregar Vitest para validaciones Zod (RULES exige coverage 70%).
8. **🟢 UI pendiente**: handlers reales o eliminar botones placeholder (admin users/reservations); corregir etiqueta "Total histórico"; unificar spinner a `Loader2`.

---

## 5. Límites honestos de esta verificación (qué NO probé)

- **No probé manualmente en navegador** ningún flujo con usuarios reales (registro, login, reserva, aprobación, check-in). Los botones §3.2–3.3 se juzgan por lectura de código, no por ejecución.
- **No verifiqué el estado desplegado en Supabase** (trigger, policies, rate limits, datos). Todo lo de BD se revisó contra `schema.sql` / `migration_*.sql` locales.
- **No probé envío real de emails** (Resend) ni el cron contra producción.
- **No revisé Vercel** (env vars, deployments, logs) en esta pasada.
- **No audité dependencias** (`pnpm audit`) ni rotación de keys.
- Archivos leídos completamente: `package.json`, `tsconfig.json`, `src/middleware.ts`, `src/lib/*`, `src/app/(auth)/*`, `src/app/(dashboard)/dashboard/page.tsx`, `reservations/page.tsx`, `reservations/actions.ts`, `profile/page.tsx`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/auth/callback/route.ts`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/actions/*`, `src/app/api/*`, `src/app/security/*`, `src/lib/emails.ts`, `src/components/forms/form.tsx`, `src/components/ui/button.tsx`, `src/components/layout/admin-layout.tsx` (parcial), `security-layout.tsx` (parcial), `tests/e2e-flow.spec.ts`. Parcialmente: `admin/areas|reservations|schedules|users`, `dashboard-layout.tsx`, `ui/calendar.tsx`, `new/page.tsx` (cabeza + secciones clave).

*Fin del informe.*
