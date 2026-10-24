// Registra el webhook de Whop de producción y guarda su secreto (docs/03 §5) sin mostrarlo.
// Uso: npm run whop:webhook
// 1. Crea (o reutiliza) el webhook de la cuenta hacia PUBLIC_APP_URL/api/webhooks/whop.
// 2. Escribe WHOP_WEBHOOK_SECRET en .env.local y lo sube a Vercel (producción) con el CLI.
// Después hay que redesplegar para que la función lea la variable nueva.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

import { WhopClient } from '@whop/sdk';

const EVENTS = ['payment.succeeded', 'membership.activated', 'membership.deactivated'] as const;

async function main() {
  const token = process.env.WHOP_API_KEY;
  const accountId = process.env.WHOP_COMPANY_ID;
  if (!token || !accountId) throw new Error('Faltan WHOP_API_KEY o WHOP_COMPANY_ID en .env.local');
  const url = `${process.env.PUBLIC_APP_URL ?? 'https://pacta-theta.vercel.app'}/api/webhooks/whop`;
  const whop = new WhopClient({ token, apiVersionDate: '2026-10-15-1' });

  const existing = [];
  for await (const hook of await whop.webhooks.list({ account_id: accountId })) existing.push(hook);
  const found = existing.find((hook) => hook.url === url);
  if (found) {
    console.log(`Ya existe el webhook ${found.id} → ${url}. Si perdiste el secreto, bórralo en Whop y vuelve a ejecutar.`);
    process.exit(0);
  }

  const hook = await whop.webhooks.create({ url, events: [...EVENTS], resource_id: accountId, api_version_date: '2026-10-15-1' });
  if (!hook.webhook_secret) throw new Error(`Webhook ${hook.id} creado sin secreto: cópialo desde el dashboard de Whop.`);
  console.log(`Webhook ${hook.id} creado → ${url} (${EVENTS.join(', ')})`);

  const envPath = '.env.local';
  const env = readFileSync(envPath, 'utf8');
  const line = `WHOP_WEBHOOK_SECRET=${hook.webhook_secret}`;
  writeFileSync(envPath, /^WHOP_WEBHOOK_SECRET=.*$/m.test(env) ? env.replace(/^WHOP_WEBHOOK_SECRET=.*$/m, line) : `${env.trimEnd()}\n${line}\n`);
  console.log('Secreto guardado en .env.local.');

  const vercel = spawnSync('npx vercel env add WHOP_WEBHOOK_SECRET production --sensitive', { input: hook.webhook_secret, shell: true, stdio: ['pipe', 'inherit', 'inherit'] });
  console.log(
    vercel.status === 0
      ? 'Secreto subido a Vercel (production). Redespliega para aplicarlo.'
      : 'No se pudo subir a Vercel: añade WHOP_WEBHOOK_SECRET a mano (Settings → Environment Variables) con el valor de .env.local.',
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
