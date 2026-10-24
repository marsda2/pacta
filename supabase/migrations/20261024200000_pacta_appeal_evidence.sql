-- Pruebas extra de una apelación (hasta 2 fotos). La nota y la fianza viven en
-- jury_tasks.raw ({appeal, panel, bondCents, note}). Las fotos se sirven por
-- /api/proofs/:id/image con el id de esta tabla.

create table if not exists pacta.appeal_evidence (
  id uuid primary key default gen_random_uuid(),
  jury_task_id uuid not null references pacta.jury_tasks (id) on delete cascade,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  data bytea not null,
  created_at timestamptz not null default now()
);

create index if not exists appeal_evidence_jury_task_id_idx on pacta.appeal_evidence (jury_task_id);

alter table pacta.appeal_evidence enable row level security;
create policy pacta_app_full_access on pacta.appeal_evidence for all to pacta_app using (true) with check (true);
grant select, insert, update, delete on pacta.appeal_evidence to pacta_app;
revoke all on pacta.appeal_evidence from anon, authenticated;
