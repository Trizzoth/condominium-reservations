-- Fotos de perfil: bucket público, 256px comprimidas en cliente (~20KB c/u).
-- Convención: {userId}/avatar.jpg (el upsert de la 2da foto evalúa la
-- policy UPDATE, que exige foldername = uid).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
CREATE POLICY "Authenticated upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users manage own avatar" ON storage.objects;
CREATE POLICY "Users manage own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
