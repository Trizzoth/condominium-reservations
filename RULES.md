# Reglas del Proyecto - MVP Reservas Condominio

## Principios Fundamentales

1. **David decide**: Todas las decisiones técnicas/estructurales finales las toma David (arquitectura, stack, convenciones).
2. **Issues primero**: Cada tarea/error/mejora = Issue en GitHub antes de codear.
3. **Ramas obligatorias**: Nunca commit directo a `main` ni `develop`. Siempre `feature/xxx` o `fix/xxx` desde `develop`.
4. **PR + Revisión**: Todo merge a `develop` requiere PR aprobado por al menos 1 persona.
5. **Commits convencionales**: `feat:`, `fix:`, `style:`, `docs:`, `chore:` - cortos y claros.

## Stack Tecnológico (Inmutable sin aprobación de David)

- **Framework**: Next.js 14+ (App Router)
- **Lenguaje**: TypeScript strict
- **Estilos**: Tailwind CSS + shadcn/ui
- **BD/Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Validación**: Zod + React Hook Form
- **Lint/Format**: ESLint + Prettier + Husky
- **Deploy**: Vercel
- **Monitoreo**: Sentry (fase 2)
- **Testing**: Playwright E2E
- **Notificaciones**: Resend (email) + Cron (Vercel)

## Estructura de Carpetas (App Router)

```
src/
├── app/                    # Rutas Next.js (App Router)
│   ├── (auth)/            # Grupo rutas auth (login, register)
│   ├── (dashboard)/       # Grupo rutas protegidas
│   ├── api/               # Server Actions / Route Handlers
│   └── layout.tsx         # Layout raíz
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── forms/             # Formularios reutilizables
│   └── layout/            # Header, Sidebar, etc.
├── lib/
│   ├── supabase/          # Cliente Supabase (server/client)
│   ├── utils.ts           # Utilidades (cn, etc.)
│   └── validations/       # Esquemas Zod
├── hooks/                 # Custom hooks
├── types/                 # Tipos TypeScript globales
└── middleware.ts          # Auth middleware
```

## Convenciones de Código

- **TypeScript strict**: `strict: true`, no `any` sin justificación
- **Componentes**: Server Components por defecto, Client Components solo si necesario (`"use client"`)
- **Server Actions**: Para mutaciones (POST/PUT/DELETE), no API Routes
- **Supabase**: Cliente server en `lib/supabase/server.ts`, cliente client en `lib/supabase/client.ts`
- **Estilos**: Solo Tailwind, nada de CSS modules/archivos CSS globales salvo `globals.css`
- **Iconos**: `lucide-react` únicamente

## Reglas de Seguridad (CRÍTICO)

- **RLS Policies**: Nunca consultar `profiles` dentro de policy de `profiles` (recursión infinita). Usar `auth.jwt() ->> 'role'`
- **UPDATE profiles**: Siempre `WITH CHECK` que valide `role` e `id` no cambien
- **Server Actions**: Siempre validar rol (`admin`/`security`) antes de mutaciones sensibles
- **RLS Policies Security**: Necesarias en `profiles`, `reservations`, `schedules` para rol `security`
- **Rate Limits**: Configurar en Supabase Auth (mínimo 10 emails/hora)

## Checklist Pre-Merge (Obligatorio)

- [ ] `pnpm typecheck` sin errores
- [ ] `pnpm lint` sin errores
- [ ] `pnpm build` compila
- [ ] `pnpm test` (si aplica) pasa
- [ ] Probado manual en navegador
- [ ] Sin `console.log` de debug
- [ ] PR con descripción clara
- [ ] 1 aprobación mínima

## Flujo Git

```
main (producción)
  ↑ PR develop→main (deploy Vercel)
develop (integración)
  ↑ PR feature/xxx→develop (revisión)
feature/xxx (trabajo individual)
```

## Convenciones de Ramas

- `feature/xxx` — Nueva funcionalidad
- `fix/xxx` — Corrección de bug
- `chore/xxx` — Tareas de mantenimiento
- `docs/xxx` — Documentación
- `refactor/xxx` — Refactoring sin cambio funcional

## Testing

- **Playwright E2E**: Tests críticos (auth, reservas, admin) obligatorios
- **Unit Tests (Vitest)**: Validaciones Zod, utils, helpers
- **Coverage mínimo**: 70% en lógica de negocio

## Prohibido

- ❌ Push directo a `main`/`develop`
- ❌ `any` type sin comentario justificando
- ❌ CSS custom fuera de `globals.css` y Tailwind
- ❌ API Routes para mutaciones (usar Server Actions)
- ❌ Commits sin prefijo convencional
- ❌ Código sin revisar en `develop`