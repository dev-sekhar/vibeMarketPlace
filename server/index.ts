import { createClient } from '@supabase/supabase-js';
import { createSubmissionServer } from './api.ts';
import { validateRepository } from './repoValidator.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGIN } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CORS_ORIGIN || CORS_ORIGIN === '*') throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and an exact CORS_ORIGIN. Never expose the service key in VITE_* variables.');
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const server = createSubmissionServer({
  async authenticate(token) {
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, name: String(data.user.user_metadata?.full_name ?? 'OpenVibes contributor').slice(0, 100) };
  },
  validate: validateRepository,
  async exists(url, repositoryId) {
    // Values are constrained to GitHub owner/repo characters by canonicalRepoUrl.
    const { data, error } = await db.from('apps').select('id').or(`repo_key.eq.${url}${repositoryId ? `,repository_id.eq.${repositoryId}` : ''}`).limit(1);
    if (error) throw error;
    return Boolean(data?.length);
  },
  async insert(record) {
    const { error } = await db.from('apps').insert(record);
    if (error?.code === '23505') return 'duplicate';
    if (error) throw error;
    return 'created';
  },
}, CORS_ORIGIN);
server.requestTimeout = 20000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT ?? 4000), () => console.log('OpenVibes submission API listening.'));
