import { createClient } from '@supabase/supabase-js';

const PROOFS_BUCKET = 'proofs';

// URL firmada de corta duración para una foto del bucket privado `proofs`.
export async function signedProofUrl(storagePath: string, expiresInSec = 3600) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');

  const { data, error } = await createClient(url, key, { auth: { persistSession: false } })
    .storage.from(PROOFS_BUCKET)
    .createSignedUrl(storagePath, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}
