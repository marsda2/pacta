-- Pactos sin dinero (onboarding y demo): arriesgan solo reputación, stake 0.
alter table pacta.pacts drop constraint pacts_stake_cents_check;
alter table pacta.pacts add constraint pacts_stake_cents_check check (stake_cents >= 0);
