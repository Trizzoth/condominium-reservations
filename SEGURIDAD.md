# Seguridad — RLS y ataques mitigados

> Estado: políticas en `supabase/migrations/000000–000003`. La `000003`
> (división por operación + fix trigger) está versionada pero **pendiente de
> aplicar en el dashboard** (SQL Editor). Todo lo demás se probó
> conductualmente el 2026-09-16/17 con JWTs reales por rol.

## Cómo leer este doc

Por cada política: qué permite, y qué ataque concreto del reto §4.2 bloquea.

## `profiles`

| Política | Permite | Bloquea |
|---|---|---|
| `Users can view own profile` (SELECT, `auth.uid() = id`) | Leer la propia fila | Un miembro leyendo perfiles ajenos (403 medido) |
| `Users insert own profile` (INSERT, `WITH CHECK auth.uid() = id`) | Crear solo la propia fila | Suplantar/crear perfiles de otros |
| `Users update own profile` (UPDATE + `WITH CHECK` rol = rol del JWT) | Editar nombre/apto/teléfono propios | **Escalación de privilegios**: ponerse `role='admin'` (el `WITH CHECK` lo rechaza) |
| `Admins select profiles` (SELECT, JWT `role='admin'`) | Admin ve todos | Miembros/security listando usuarios |

Nunca se consulta `profiles` dentro de una policy de `profiles`
(eso causaba recursión infinita 42P17). El rol sale de `auth.jwt() ->> 'role'`.

## `reservations`

| Política | Permite | Bloquea |
|---|---|---|
| `Users view own reservations` | Ver las propias | Ver reservas ajenas |
| `Users create reservations` (`WITH CHECK user_id`) | Crear a su nombre | **Crear a nombre de otro** (403 medido con JWT residente) |
| `Users cancel own pending` | Cancelar propia pendiente | **Cancelar reserva ajena** (el `eq(user_id)` + policy lo niegan) |
| `Admins {select,insert,update,delete} reservations` (JWT admin) | Gestión total admin | Miembros tocando reservas ajenas |
| `Security can view today's reservations` | Turno del día | Ver historial completo |
| `Security can check-in/out` (UPDATE) | Marcar accesos | Cambiar estado/dueño (solo columnas de acceso en código) |

El servidor además valida: solape (app + `EXCLUDE`), cupo semanal,
ventana 2h, área activa, y usa el `user.id` de la sesión (nunca del cliente).

## `common_areas` / `availability_schedules`

| Política | Permite | Bloquea |
|---|---|---|
| Lectura pública (`is_active`, `true`) | Ver disponibilidad sin login | Nada sensible (datos públicos por diseño) |
| `Admins {select,insert,update,delete}` (JWT admin, por operación) | CRUD admin | **Crear/editar áreas sin ser admin** (403 medido con JWT residente) |

## Secretos y superficie

- `SUPABASE_SERVICE_ROLE_KEY` solo en servidor (`src/lib/supabase/admin.ts`);
  jamás en cliente ni `NEXT_PUBLIC_`. Verificado por grep en CI informal.
- Nada commiteado: `.env.local` en `.gitignore`; `.env.example` sin valores.
- `CRON_SECRET` protege los crons (401 sin él, probado en vivo).

## Riesgos residuales honestos (no cubiertos por RLS)

1. **Límite semanal y horario 07–21 vía insert directo**: RLS no puede
   contar semanas ni validar horas; lo impone el servidor. Un token válido
   escribiendo directo a la tabla lo salta. Mitigación futura: trigger/función
   en BD si se exige.
2. **JWT `role` puede ir desactualizado** hasta re-login tras un cambio de rol.
3. **Rate limits de email** mitigados con SMTP propio (30/h).
