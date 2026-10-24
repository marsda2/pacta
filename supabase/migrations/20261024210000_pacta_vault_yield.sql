-- Redemption Vault: movimiento 'yield' para el rendimiento simulado que se abona al rescatar un
-- tramo con el High-Yield Pass. Es informativo: no cambia el saldo bloqueado
-- (saldo = Σ lock − Σ unlock − Σ fee).
alter table pacta.vault_ledger drop constraint vault_ledger_type_check;
alter table pacta.vault_ledger add constraint vault_ledger_type_check check (type in ('lock', 'unlock', 'fee', 'yield'));
