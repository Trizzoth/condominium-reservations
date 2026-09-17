-- Migration: políticas RLS separadas por operación + fix trigger schedules
-- Reto §5.1: una política explícita por operación (nada de FOR ALL genéricos).
-- El rol se lee de auth.jwt() ->> 'role' (nunca profiles dentro de policy
-- de profiles: eso causaba recursión infinita 42P17).
-- El constraint EXCLUDE no_overlap de reservations NO se toca (RN-01).

-- 0. Fix trigger roto: algún trigger hace NEW.updated_at en
-- availability_schedules pero la columna no existe (probado en vivo:
-- UPDATE falla con 'record "new" has no field "updated_at"').
-- Agregar la columna repara el trigger sin conocer su nombre.
ALTER TABLE availability_schedules
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 1. profiles: admin por JWT (la versión con EXISTS sobre profiles
-- recursaba), INSERT propio (faltaba: guardar perfil fallaba) y
-- UPDATE propio con WITH CHECK anti-escalación de rol.
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins select profiles" ON profiles
FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (auth.jwt() ->> 'role'));

CREATE POLICY "Users insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. common_areas: separar "Admins manage areas" (FOR ALL).
DROP POLICY IF EXISTS "Admins manage areas" ON common_areas;
CREATE POLICY "Admins select areas" ON common_areas
FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins insert areas" ON common_areas
FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins update areas" ON common_areas
FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins delete areas" ON common_areas
FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

-- 3. reservations: separar "Admins manage all reservations" (FOR ALL).
-- (RN-01: el EXCLUDE no_overlap sigue intacto.)
DROP POLICY IF EXISTS "Admins manage all reservations" ON reservations;
CREATE POLICY "Admins select reservations" ON reservations
FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins insert reservations" ON reservations
FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins update reservations" ON reservations
FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins delete reservations" ON reservations
FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

-- 4. availability_schedules: separar "Admins manage schedules" (FOR ALL).
DROP POLICY IF EXISTS "Admins manage schedules" ON availability_schedules;
CREATE POLICY "Admins select schedules" ON availability_schedules
FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins insert schedules" ON availability_schedules
FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins update schedules" ON availability_schedules
FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins delete schedules" ON availability_schedules
FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

-- NOTA: las policies de usuario ("Users view/create/cancel own"),
-- las de lectura pública y las de security (000001) se dejan intactas.
