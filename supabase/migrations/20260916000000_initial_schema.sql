-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- necesario para EXCLUDE constraint

-- 2. Perfiles (extiende auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  apartment text,
  phone text,
  role text CHECK (role IN ('resident', 'admin', 'security')) DEFAULT 'resident',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Áreas comunes
CREATE TABLE common_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  capacity integer,
  rules text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Reservas (CON CONSTRAINT ANTI-SOLAPAMIENTO - usa tstzrange para timestamptz)
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  common_area_id uuid REFERENCES common_areas(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    common_area_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('pending', 'approved'))
);

-- 5. Horarios disponibilidad
CREATE TABLE availability_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  common_area_id uuid REFERENCES common_areas(id) ON DELETE CASCADE,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  open_time time NOT NULL,
  close_time time NOT NULL,
  max_duration_hours int DEFAULT 4,
  created_at timestamptz DEFAULT now()
);

-- 6. RLS (Row Level Security) - IMPORTANTE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas common_areas (todos ven activas)
CREATE POLICY "Anyone can view active areas" ON common_areas FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage areas" ON common_areas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas reservations
CREATE POLICY "Users view own reservations" ON reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create reservations" ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users cancel own pending" ON reservations FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins manage all reservations" ON reservations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas schedules
CREATE POLICY "Anyone view schedules" ON availability_schedules FOR SELECT USING (true);
CREATE POLICY "Admins manage schedules" ON availability_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 7. Trigger: crear profile automático al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'resident');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER common_areas_updated_at BEFORE UPDATE ON common_areas FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON availability_schedules FOR EACH ROW EXECUTE FUNCTION handle_updated_at();