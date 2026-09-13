/** Shared checks; the trusted submission server repeats all checks. */
export const PROJECT_STATUSES = ['experimental', 'usable', 'maintained'] as const;
export function sourceAtRevision(repoUrl: string, commit?: string | null): string {
  if (!commit || !/^[a-f0-9]{40}$/.test(commit)) return repoUrl;
  try { return `${canonicalRepoUrl(repoUrl)}/tree/${commit}`; } catch { return repoUrl; }
}
export function canonicalRepoUrl(value: unknown): string {
  if (typeof value !== 'string' || !/^https:\/\/github\.com\/[a-z0-9-]+\/[a-z0-9_.-]+\/?$/i.test(value.trim())) throw new Error('A public https://github.com/owner/repository URL is required (no branch, query or credentials).');
  const input = value.trim().replace(/\/$/, '').replace(/\.git$/i, '');
  const repo = input.split('/').pop();
  if (!repo || repo === '.' || repo === '..') throw new Error('Invalid repository name.');
  return input.toLowerCase();
}
export function isWebUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
export function submissionErrors(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const [key, min, max] of [['name', 3, 60], ['short_description', 20, 120], ['long_description', 80, 10000]] as const) {
    const v = data[key];
    if (typeof v !== 'string' || v.trim().length < min || v.length > max) errors.push(`${key} must contain ${min}–${max} characters.`);
  }
  try { canonicalRepoUrl(data.repo_url); } catch (e) { errors.push((e as Error).message); }
  if (!['Web App', 'CLI Tool', 'Productivity', 'Game', 'Developer Tool', 'Finance', 'AI Assistant'].includes(String(data.category))) errors.push('Choose a supported category.');
  if (!PROJECT_STATUSES.includes(data.project_status as typeof PROJECT_STATUSES[number])) errors.push('Declare the project status: experimental, usable or maintained.');
  if (data.sharing_consent !== true) errors.push('Confirm your right to share this project under its open-source license.');
  for (const key of ['app_url', 'thumbnail_url']) if (data[key] != null && data[key] !== '' && !isWebUrl(data[key])) errors.push(`${key} must be a valid HTTP(S) URL.`);
  for (const key of ['tags', 'tech_stack']) if (!Array.isArray(data[key]) || data[key].length > 12 || data[key].some((v: unknown) => typeof v !== 'string' || v.length > 50)) errors.push(`${key} must contain at most 12 short text values.`);
  if (data.community_links != null && (!Array.isArray(data.community_links) || data.community_links.length > 3 || data.community_links.some((v: unknown) => {
    if (!v || typeof v !== 'object') return true;
    const link = v as Record<string, unknown>;
    return !['slack', 'whatsapp', 'telegram'].includes(String(link.platform)) || !isWebUrl(link.url);
  }))) errors.push('Community links must use supported platforms and HTTP(S) URLs.');
  return errors;
}
