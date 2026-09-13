import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { canonicalRepoUrl, submissionErrors } from '../src/lib/submissionPolicy.ts';
import type { ValidationResult } from './repoValidator.ts';

export interface Dependencies {
  authenticate(token: string): Promise<{ id: string; name: string } | null>;
  validate(url: string): Promise<ValidationResult>;
  exists(url: string, repositoryId?: number): Promise<boolean>;
  insert(record: Record<string, unknown>): Promise<'created' | 'duplicate'>;
}
export function createSubmissionServer(deps: Dependencies, origin: string) {
  const attempts = new Map<string, { count: number; expires: number }>();
  let running = 0;
  return http.createServer(async (req, res) => {
    const send = (status: number, data: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
      res.end(JSON.stringify(data));
    };
    if (req.headers.origin && req.headers.origin !== origin) { send(403, { error: 'Origin is not allowed.' }); return; }
    if (req.method === 'OPTIONS') { send(204, null); return; }
    if (req.method !== 'POST' || !['/submit-app', '/validate-repo'].includes(req.url ?? '')) { send(404, { error: 'Not found.' }); return; }
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
    if (!match) { send(401, { error: 'Sign in to submit.' }); return; }
    let reserved = false;
    try {
      const user = await deps.authenticate(match[1]);
      if (!user) { send(401, { error: 'Session expired. Sign in again.' }); return; }
      for (const [key, value] of attempts) if (value.expires <= Date.now()) attempts.delete(key);
      const usage = attempts.get(user.id) ?? { count: 0, expires: Date.now() + 3600000 };
      if (usage.count >= 5 || running >= 4 || attempts.size >= 10000) { send(429, { error: 'Submission limit reached. Please try again later.' }); return; }
      usage.count++; attempts.set(user.id, usage); running++; reserved = true;
      if (!req.headers['content-type']?.startsWith('application/json')) { send(415, { error: 'Send JSON.' }); return; }
      const chunks: Buffer[] = []; let length = 0;
      // Timeout protects body parsing as well as the GitHub per-call timeouts.
      req.setTimeout(15000, () => req.destroy());
      for await (const chunk of req) {
        const buffer = Buffer.from(chunk); length += buffer.length;
        if (length > 65536) { send(413, { error: 'Submission is too large.' }); return; }
        chunks.push(buffer);
      }
      let data: Record<string, unknown>;
      try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { send(400, { error: 'Invalid JSON.' }); return; }
      if (!data || typeof data !== 'object' || Array.isArray(data)) { send(400, { error: 'Send a JSON object.' }); return; }
      const preview = req.url === '/validate-repo';
      let url: string;
      try { url = canonicalRepoUrl(preview ? data.repoUrl : data.repo_url); } catch (e) { send(422, { errors: [(e as Error).message] }); return; }
      if (!preview) {
        const errors = submissionErrors(data);
        if (errors.length) { send(422, { errors }); return; }
        if (await deps.exists(url)) { send(409, { error: 'This repository is already listed or awaiting review.' }); return; }
      }
      const validation = await deps.validate(url);
      if (!validation.pass) { send(422, validation); return; }
      if (preview) { send(200, validation); return; }
      // Only trusted validator output can establish identity or a checked revision.
      if (!validation.commit || !/^[a-f0-9]{40}$/.test(validation.commit) || !Number.isSafeInteger(validation.repositoryId) || !validation.license) { send(503, { error: 'Incomplete validation. Submission was not saved.' }); return; }
      if (await deps.exists(url, validation.repositoryId)) { send(409, { error: 'This repository is already listed or awaiting review.' }); return; }
      const result = await deps.insert({
        name: String(data.name).trim(), slug: `${String(data.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}-${randomUUID()}`,
        short_description: String(data.short_description).trim(), long_description: String(data.long_description).trim(),
        category: data.category, repo_url: url, app_url: data.app_url ?? '', thumbnail_url: data.thumbnail_url ?? '',
        tags: data.tags, tech_stack: data.tech_stack, community_links: data.community_links ?? null,
        author_id: user.id, author_name: user.name, project_status: data.project_status,
        sharing_consent: true, moderation_status: 'pending_review', repository_id: validation.repositoryId,
        validated_commit: validation.commit, validation_report: validation, validated_at: new Date().toISOString(),
      });
      send(result === 'duplicate' ? 409 : 201, result === 'duplicate' ? { error: 'This repository is already listed or awaiting review.' } : { status: 'pending_review', warnings: validation.warnings });
    } catch {
      // Never return backend credentials, SQL details or remote response bodies.
      send(503, { error: 'Submission service unavailable. Nothing was confirmed; retry shortly.' });
    } finally { if (reserved) running--; }
  });
}
