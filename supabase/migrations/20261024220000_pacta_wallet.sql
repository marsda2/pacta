-- Saldo prepagado (docs/01): el usuario recarga en Whop y paga sus stakes con el saldo. Un pacto
-- cumplido devuelve el stake al saldo al momento, sin reembolso ni comisión de Whop, y así el
-- stake mínimo baja a $1. Saldo = Σ topup + Σ release + Σ vault_unlock − Σ hold − Σ withdraw.
--   topup        recarga pagada en Whop (whop_ref = pago)
--   hold         stake retenido de un pacto pagado con saldo
--   release      stake devuelto al cumplir el pacto
--   vault_unlock tramo del Vault rescatado de un stake pagado con saldo
--   withdraw     retirada a la tarjeta: reembolso parcial de una recarga (whop_ref = ese pago)

create table if not exists pacta.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references pacta.users (id) on delete restrict,
  type text not null check (type in ('topup', 'hold', 'release', 'vault_unlock', 'withdraw')),
  amount_cents int not null check (amount_cents > 0),
  pact_id uuid references pacta.pacts (id) on delete set null,
  whop_ref text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_user_id_idx on pacta.wallet_ledger (user_id);
-- Una recarga por pago de Whop, aunque el webhook llegue dos veces.
create unique index if not exists wallet_ledger_topup_ref_idx on pacta.wallet_ledger (whop_ref) where type = 'topup';

alter table pacta.wallet_ledger enable row level security;
create policy pacta_app_full_access on pacta.wallet_ledger for all to pacta_app using (true) with check (true);
grant select, insert, update, delete on pacta.wallet_ledger to pacta_app;
revoke all on pacta.wallet_ledger from anon, authenticated;

-- El pacto se pagó con el saldo (no tiene whop_payment_id): al cumplirlo, el stake vuelve al saldo.
alter table pacta.pacts add column if not exists paid_with_credit boolean not null default false;
