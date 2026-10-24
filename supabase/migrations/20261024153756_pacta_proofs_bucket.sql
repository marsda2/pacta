-- Bucket privado para las fotos de prueba de PACTA.
-- Sin políticas de Storage: solo el servidor (service role) lee y escribe.
-- Las fotos se sirven con URLs firmadas de corta duración.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
