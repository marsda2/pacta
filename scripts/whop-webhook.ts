// Registra el webhook de Whop de producción y guarda su secreto (docs/03 §5) sin mostrarlo.
// Uso: npm run whop:webhook                → lo crea si no existe
//      npm run whop:webhook -- --replace    → borra el que ya hay (p. ej. sin secreto guardado) y lo crea
// 1. Crea el webhook de la cuenta hacia PUBLIC_APP_URL/api/webhooks/whop.
// 2. Escribe WHOP_WEBHOOK_SECRET en .env.local y lo sube a Vercel (producción) con el CLI de
//    Vercel instalado y con sesión (`vercel whoami`); la carpeta debe estar enlazada (.vercel/).
// 3. Redespliega producción para que la función lea la variable nueva.
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
  const found = existing.filter((hook) => hook.url === url);
  if (found.length > 0 && !process.argv.includes('--replace')) {
    console.log(`Ya existe el webhook ${found[0].id} → ${url}. Whop solo enseña el secreto al crearlo: si no lo tienes, ejecuta npm run whop:webhook -- --replace`);
    process.exit(0);
  }
  for (const hook of found) {
    await whop.webhooks.delete({ id: hook.id });
    console.log(`Webhook ${hook.id} borrado.`);
  }

  const hook = await whop.webhooks.create({ url, events: [...EVENTS], resource_id: accountId, api_version_date: '2026-10-15-1' });
  if (!hook.webhook_secret) throw new Error(`Webhook ${hook.id} creado sin secreto: cópialo desde el dashboard de Whop.`);
  console.log(`Webhook ${hook.id} creado → ${url} (${EVENTS.join(', ')})`);

  const envPath = '.env.local';
  const env = readFileSync(envPath, 'utf8');
  const line = `WHOP_WEBHOOK_SECRET=${hook.webhook_secret}`;
  writeFileSync(envPath, /^WHOP_WEBHOOK_SECRET=.*$/m.test(env) ? env.replace(/^WHOP_WEBHOOK_SECRET=.*$/m, line) : `${env.trimEnd()}\n${line}\n`);
  console.log('Secreto guardado en .env.local.');

  // CLI de Vercel global, no npx: una pregunta de instalación de npx se tragaría el secreto por stdin.
  const vercel = spawnSync('vercel env add WHOP_WEBHOOK_SECRET production --sensitive', { input: hook.webhook_secret, shell: true, stdio: ['pipe', 'inherit', 'inherit'] });
  if (vercel.status !== 0) {
    console.log('No se pudo subir a Vercel: añade WHOP_WEBHOOK_SECRET a mano (Settings → Environment Variables) con el valor de .env.local y redespliega.');
    process.exit(1);
  }
  console.log('Secreto subido a Vercel (production). Redesplegando…');
  const host = new URL(url).host;
  const redeploy = spawnSync(`vercel redeploy ${host} --target production`, { shell: true, stdio: 'inherit' });
  console.log(redeploy.status === 0 ? 'Listo: producción ya verifica los webhooks de Whop.' : `Redespliega a mano: vercel redeploy ${host} --target production`);
  process.exit(redeploy.status ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
