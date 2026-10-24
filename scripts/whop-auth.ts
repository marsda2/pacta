// Configure the existing Whop app for Expo's public OAuth + PKCE flow.
// No API key or OAuth token is printed or passed through command arguments.
import { WhopClient } from '@whop/sdk';

async function main() {
  if (!process.env.WHOP_API_KEY || !process.env.WHOP_APP_ID) throw new Error('Faltan WHOP_API_KEY o WHOP_APP_ID');
  const client = new WhopClient({ token: process.env.WHOP_API_KEY, apiVersionDate: '2026-10-15-1' });
  const app = await client.apps.retrieve({ id: process.env.WHOP_APP_ID });
  const callbacks = [
    `${(process.env.PUBLIC_APP_URL || 'https://pacta-theta.vercel.app').replace(/\/$/, '')}/auth/callback`,
    'pacta://auth/callback',
    'http://localhost:8081/auth/callback',
    'http://localhost:8082/auth/callback',
    'http://127.0.0.1:8081/auth/callback',
    'http://127.0.0.1:8082/auth/callback',
    ...(process.env.WHOP_OAUTH_REDIRECT_URIS || '').split(',').map((uri) => uri.trim()).filter(Boolean),
  ];
  const redirectUris = [...new Set([...app.redirect_uris, ...callbacks])];
  await client.apps.update({ id: app.id, oauth_client_type: 'public', redirect_uris: redirectUris });
  const saved = await client.apps.retrieve({ id: app.id });
  if (saved.oauth_client_type !== 'public' || !callbacks.every((uri) => saved.redirect_uris.includes(uri))) throw new Error('Whop no guardó la configuración OAuth');
  console.log(`OAuth de ${saved.name} (${saved.id}) configurado con PKCE. ${saved.redirect_uris.length} direcciones de retorno verificadas. No requiere client secret.`);
}

main().catch(() => { console.error('No se pudo configurar OAuth. Comprueba la app y los permisos de la API key.'); process.exitCode = 1; });
