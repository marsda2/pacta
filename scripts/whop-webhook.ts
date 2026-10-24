// Registra el webhook de Whop de producción y guarda su secreto (docs/03 §5) sin mostrarlo.
// Uso: npm run whop:webhook                → lo crea si no existe; si ya existe y su secreto está
//                                            en .env.local, solo lo sube a Vercel y redespliega
//      npm run whop:webhook -- --replace    → borra el que ya hay (p. ej. sin secreto guardado) y lo crea
// 1. Crea el webhook de la cuenta hacia PUBLIC_APP_URL/api/webhooks/whop.
// 2. Escribe WHOP_WEBHOOK_SECRET en .env.local y lo sube a Vercel (producción) con el CLI de
//    Vercel con sesión (`vercel whoami`); la carpeta debe estar enlazada (.vercel/).
// 3. Redespliega producción para que la función lea la variable nueva.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { WhopClient } from '@whop/sdk';

const EVENTS = ['payment.succeeded', 'membership.activated', 'membership.deactivated'] as const;
const ENV_PATH = '.env.local';
const SECRET_LINE = /^WHOP_WEBHOOK_SECRET=(.+)$/m;

// El CLI de Vercel instalado con npm -g no siempre está en el PATH de PowerShell: se busca en la
// carpeta global de npm. npx queda de respaldo con --yes, para que ninguna pregunta de instalación
// se trague el secreto que va por stdin.
function vercelCli(): string {
  const global = join(process.env.APPDATA ?? '', 'npm', 'vercel.cmd');
  return process.platform === 'win32' && existsSync(global) ? `"${global}"` : 'npx --yes vercel';
}

function pushSecretAndRedeploy(secret: string, host: string) {
  const cli = vercelCli();
  // --force sustituye el valor si ya había uno; --yes evita preguntas que leerían de stdin.
  const add = spawnSync(`${cli} env add WHOP_WEBHOOK_SECRET production --sensitive --force --yes`, {
    input: secret,
    shell: true,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (add.status !== 0) {
    console.log('No se pudo subir a Vercel: añade WHOP_WEBHOOK_SECRET a mano (Settings → Environment Variables) con el valor de .env.local y redespliega.');
    process.exit(1);
  }
  console.log('Secreto subido a Vercel (production). Redesplegando…');
  const redeploy = spawnSync(`${cli} redeploy ${host} --target production`, { shell: true, stdio: 'inherit' });
  console.log(redeploy.status === 0 ? 'Listo: producción ya verifica los webhooks de Whop.' : `Redespliega a mano: vercel redeploy ${host} --target production`);
  process.exit(redeploy.status ?? 0);
}

async function main() {
  const token = process.env.WHOP_API_KEY;
  const accountId = process.env.WHOP_COMPANY_ID;
  if (!token || !accountId) throw new Error('Faltan WHOP_API_KEY o WHOP_COMPANY_ID en .env.local');
  const url = `${process.env.PUBLIC_APP_URL ?? 'https://pacta-theta.vercel.app'}/api/webhooks/whop`;
  const host = new URL(url).host;
  const whop = new WhopClient({ token, apiVersionDate: '2026-10-15-1' });
  const env = readFileSync(ENV_PATH, 'utf8');

  const existing = [];
  for await (const hook of await whop.webhooks.list({ account_id: accountId })) existing.push(hook);
  const found = existing.filter((hook) => hook.url === url);
  if (found.length > 0 && !process.argv.includes('--replace')) {
    const saved = SECRET_LINE.exec(env)?.[1]?.trim();
    if (saved) {
      console.log(`Ya existe el webhook ${found[0].id} y su secreto está en .env.local.`);
      return pushSecretAndRedeploy(saved, host);
    }
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

  const line = `WHOP_WEBHOOK_SECRET=${hook.webhook_secret}`;
  writeFileSync(ENV_PATH, SECRET_LINE.test(env) ? env.replace(SECRET_LINE, line) : `${env.trimEnd()}\n${line}\n`);
  console.log('Secreto guardado en .env.local.');
  pushSecretAndRedeploy(hook.webhook_secret, host);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
