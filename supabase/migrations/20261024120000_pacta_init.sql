-- PACTA vive en su propio esquema dentro del proyecto de Supabase de TexhCo.
-- No toca public ni ningún otro esquema. Sin API expuesta: el servidor (Vercel)
-- se conecta directamente a Postgres; RLS queda activado sin políticas, así que
-- anon y authenticated no leen ni escriben nada.

create schema if not exists pacta;

create table pacta.users (
  id uuid primary key default gen_random_uuid(),
  whop_user_id text not null unique,
  email text,
  trust_score int not null default 50 check (trust_score between 0 and 100),
  tier text not null default 'free' check (tier in ('free', 'high_yield')),
  withdrawals_locked_until timestamptz,
  verified_streak int not null default 0 check (verified_streak >= 0),
  created_at timestamptz not null default now()
);

create table pacta.pacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references pacta.users (id) on delete restrict,
  title text not null,
  stake_cents int not null check (stake_cents > 0),
  deadline timestamptz not null,
  day_code text not null,
  status text not null default 'DRAFT' check (
    status in (
      'DRAFT', 'AWAITING_PAYMENT', 'ACTIVE', 'AI_REVIEW', 'JURY_PENDING',
      'MICRO_TASK_PENDING', 'APPROVED', 'REFUNDED', 'FAILED', 'VAULTED'
    )
  ),
  whop_checkout_id text,
  whop_payment_id text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table pacta.proofs (
  id uuid primary key default gen_random_uuid(),
  pact_id uuid not null references pacta.pacts (id) on delete cascade,
  storage_path text not null,
  captured_live boolean not null default false,
  emotional_state text not null default 'normal' check (emotional_state in ('normal', 'overwhelmed')),
  ai_prompt_version text,
  ai_verdict text check (ai_verdict in ('APPROVE', 'UNSURE', 'REJECT')),
  ai_confidence numeric(4, 3) check (ai_confidence between 0 and 1),
  ai_cheat_signals jsonb not null default '[]'::jsonb,
  ai_reason text,
  created_at timestamptz not null default now()
);

create table pacta.jury_tasks (
  id uuid primary key default gen_random_uuid(),
  proof_id uuid not null references pacta.proofs (id) on delete cascade,
  terac_task_id text,
  status text not null default 'pending' check (status in ('pending', 'done', 'expired')),
  verdict text check (verdict in ('APPROVE', 'REJECT', 'CHEAT', 'MICRO_TASK')),
  micro_task text,
  raw jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table pacta.vault_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references pacta.users (id) on delete restrict,
  type text not null check (type in ('lock', 'unlock', 'fee')),
  amount_cents int not null check (amount_cents > 0),
  pact_id uuid references pacta.pacts (id) on delete set null,
  whop_ref text,
  created_at timestamptz not null default now()
);

create table pacta.trust_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references pacta.users (id) on delete cascade,
  delta int not null,
  reason text not null,
  pact_id uuid references pacta.pacts (id) on delete set null,
  created_at timestamptz not null default now()
);

create table pacta.agent_prompts (
  version text primary key,
  content text not null,
  few_shots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table pacta.eval_runs (
  id uuid primary key default gen_random_uuid(),
  prompt_version text not null references pacta.agent_prompts (version) on delete cascade,
  accuracy numeric(4, 3),
  cheats_caught int not null default 0,
  false_approvals int not null default 0,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Idempotencia de webhooks: el id es el del evento del proveedor.
create table pacta.webhook_events (
  id text primary key,
  source text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create index pacts_user_id_idx on pacta.pacts (user_id);
create index proofs_pact_id_idx on pacta.proofs (pact_id);
create index jury_tasks_proof_id_idx on pacta.jury_tasks (proof_id);
create index vault_ledger_user_id_idx on pacta.vault_ledger (user_id);
create index trust_events_user_id_idx on pacta.trust_events (user_id);
create index eval_runs_prompt_version_idx on pacta.eval_runs (prompt_version);

alter table pacta.users enable row level security;
alter table pacta.pacts enable row level security;
alter table pacta.proofs enable row level security;
alter table pacta.jury_tasks enable row level security;
alter table pacta.vault_ledger enable row level security;
alter table pacta.trust_events enable row level security;
alter table pacta.agent_prompts enable row level security;
alter table pacta.eval_runs enable row level security;
alter table pacta.webhook_events enable row level security;

revoke all on schema pacta from anon, authenticated;
revoke all on all tables in schema pacta from anon, authenticated;
