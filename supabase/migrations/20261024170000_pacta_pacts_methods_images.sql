-- Métodos de prueba por pacto y almacén de imágenes en Postgres.
-- Mientras no exista SUPABASE_SERVICE_ROLE_KEY (Storage), las fotos de prueba se guardan
-- aquí; proofs.storage_path apunta a 'db:<proof_id>'. Se sirven por /api/proofs/:id/image.

alter table pacta.pacts
  add column if not exists proof_methods text[] not null default array['photo']
  check (proof_methods <@ array['photo', 'location', 'witness']);

create table if not exists pacta.proof_images (
  proof_id uuid primary key references pacta.proofs (id) on delete cascade,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  data bytea not null,
  created_at timestamptz not null default now()
);

alter table pacta.proof_images enable row level security;
create policy pacta_app_full_access on pacta.proof_images for all to pacta_app using (true) with check (true);
grant select, insert, update, delete on pacta.proof_images to pacta_app;
revoke all on pacta.proof_images from anon, authenticated;
