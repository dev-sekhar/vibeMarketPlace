import { readFileSync } from 'node:fs';
import { canonicalRepoUrl } from '../src/lib/submissionPolicy.ts';

// Module-relative configuration; missing/invalid configuration fails closed.
const policy = JSON.parse(readFileSync(new URL('../config/validation-config.json', import.meta.url), 'utf8')) as {
  maxRepositoryKB: number; maxTreeEntries: number; maxDocumentBytes: number; acceptedLicenses: string[];
};
if (!policy.acceptedLicenses?.length || !(policy.maxRepositoryKB > 0) || !(policy.maxTreeEntries > 0) || !(policy.maxDocumentBytes > 0)) throw new Error('Invalid validation policy.');
export interface ValidationResult {
  pass: boolean; errors: string[]; warnings: string[];
  repoUrl?: string; repositoryId?: number; commit?: string; license?: string; testedCommit?: string;
}
export interface TreeEntry { path: string; type: string; mode: string; size?: number; sha: string }
export interface Snapshot {
  repoUrl: string; repositoryId: number; commit: string; license: string; files: TreeEntry[];
  readme: string; licenseText: string; gitignore: string; report: string;
}
const meaningful = (value: unknown, min = 20): value is string => typeof value === 'string' && value.trim().length >= min && !/^(todo|tbd|placeholder|coming soon|n\/a|\.\.\.)[.!\s]*$/i.test(value.trim());
export function inspectSnapshot(snapshot: Snapshot, now = Date.now()): ValidationResult {
  const errors: string[] = [];
  const warnings = ['Documentation checks only: tests were not executed; safety, usefulness and license compliance are not certified.'];
  const paths = snapshot.files.map(file => file.path);
  if (!meaningful(snapshot.readme, 300)) errors.push('README.md must explain the project (at least 300 characters); an empty or placeholder README is insufficient.');
  const sections = [
    ['Purpose / who it helps', /^(purpose|overview|about|what it does|introduction)/i],
    ['Setup / installation', /^(setup|installation|getting started|quick ?start|prerequisites)/i],
    ['Usage / example', /^(usage|how to use|example|running|run locally)/i],
    ['Limitations / project status', /^(limitations|known issues|project status|status)/i],
  ] as const;
  const parts = snapshot.readme.split(/^#{1,6}\s+/m).slice(1).map(section => {
    const end = section.indexOf('\n');
    return end < 0 ? [section, ''] : [section.slice(0, end).trim(), section.slice(end + 1).trim()];
  });
  for (const [label, pattern] of sections) if (!parts.some(([heading, body]) => pattern.test(heading) && meaningful(body))) errors.push(`README.md needs a substantive ${label} section (Markdown heading and at least 20 characters).`);
  if (!policy.acceptedLicenses.includes(snapshot.license) || !meaningful(snapshot.licenseText, 200)) errors.push('LICENSE must contain a supported open-source license recognised by GitHub. Empty/custom/unidentified licenses need maintainer review.');
  if (!meaningful(snapshot.gitignore, 3)) errors.push('A nonempty .gitignore is required.');
  if (!paths.some(p => /\.(tsx?|jsx?|py|rs|go|java|c|cpp|cs|rb|php|swift|kt|sh|html|ipynb|vue|svelte|dart|r)$/i.test(p) && !/(^|\/)(tests?|docs?|examples?|node_modules|vendor)\//i.test(p))) errors.push('Include application source code, not just documentation.');
  for (const file of snapshot.files) {
    if (file.mode === '120000' || file.type === 'commit') errors.push(`Symlinks and submodules need manual review: ${file.path}`);
    const name = file.path.split('/').pop() ?? '';
    if ((/^\.env(?:\.|$)/i.test(name) && !/\.(example|sample|template)$/i.test(name)) || /^(credentials\.json|id_rsa|id_ed25519|private\.key)$/i.test(name) || /\.(p12|pfx)$/i.test(name)) errors.push(`Potential sensitive file committed: ${file.path}. Remove it and rotate exposed credentials.`);
  }
  // Limited to inspected documentation. Never return matched credential values.
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}/.test([snapshot.readme, snapshot.licenseText, snapshot.report].join('\n'))) errors.push('Potential credential in documentation. Remove it and rotate exposed credentials.');
  let testedCommit: string | undefined;
  try {
    const report = JSON.parse(snapshot.report) as Record<string, unknown>;
    if (!report || typeof report !== 'object' || Array.isArray(report)) throw new Error();
    testedCommit = typeof report.testedCommit === 'string' ? report.testedCommit : undefined;
    if (!testedCommit || !/^[a-f0-9]{40}$/.test(testedCommit)) errors.push('TEST_REPORT.json needs testedCommit: the full 40-character Git commit SHA tested.');
    const testedAt = typeof report.testedAt === 'string' ? Date.parse(report.testedAt) : NaN;
    if (!Number.isFinite(testedAt) || testedAt > now + 300000) errors.push('TEST_REPORT.json needs a valid testedAt timestamp, not in the future.');
    if (!meaningful(report.environment, 10) || !meaningful(report.command, 3)) errors.push('TEST_REPORT.json must describe the environment and reproducible command or manual test steps.');
    if (!meaningful(report.limitations)) errors.push('TEST_REPORT.json must describe known limitations or explicitly explain what was checked and that none are known.');
    if (!Array.isArray(report.results) || report.results.length === 0 || report.results.length > 100) errors.push('TEST_REPORT.json needs 1–100 named test results.');
    else {
      for (const entry of report.results) if (!entry || typeof entry !== 'object' || !meaningful(entry.name, 5) || !meaningful(entry.expected, 10) || !meaningful(entry.actual, 10) || !['passed', 'failed', 'skipped'].includes(entry.status)) errors.push('Each test result needs name, expected, actual and status (passed, failed or skipped).');
      if (!report.results.some(entry => entry?.status === 'passed')) errors.push('Document at least one passing functional test.');
      if (report.results.some(entry => entry?.status === 'failed' || entry?.status === 'skipped')) warnings.push('Failed/skipped tests are disclosed; reviewer must assess the limitations.');
    }
  } catch { errors.push('Add a valid root TEST_REPORT.json with reproducible test evidence; a filename or “all tests pass” is insufficient.'); }
  for (const file of ['CONTRIBUTING.md', 'SECURITY.md']) if (!paths.some(p => p.toLowerCase() === file.toLowerCase())) warnings.push(`Consider adding ${file}.`);
  if (!paths.some(p => p.startsWith('.github/workflows/'))) warnings.push('No GitHub Actions workflow found. CI is recommended, not required.');
  return { pass: errors.length === 0, errors, warnings, repoUrl: snapshot.repoUrl, repositoryId: snapshot.repositoryId, commit: snapshot.commit, license: snapshot.license, testedCommit };
}

export async function validateRepository(input: string, fetcher: typeof fetch = fetch): Promise<ValidationResult> {
  try {
    const repoUrl = canonicalRepoUrl(input);
    const repo = repoUrl.slice('https://github.com/'.length);
    // No arbitrary hosts, redirects, clone, dependency installation or submitted code execution.
    const api = async <T>(suffix: string): Promise<T> => {
      const response = await fetcher(`https://api.github.com/repos/${repo}${suffix}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'OpenVibes-validator', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
        signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}; check public access or retry after rate limits reset.`);
      // Stream with an actual cap rather than trusting Content-Length.
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty GitHub response.');
      let size = 0; const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break;
          size += part.value.length;
          if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new Error('Repository metadata exceeds the validation limit.'); }
          chunks.push(part.value);
        }
      } finally { reader.releaseLock(); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
    };
    const metadata = await api<{ id: number; private: boolean; visibility: string; archived: boolean; disabled: boolean; size: number; default_branch: string }>('');
    if (metadata.private || metadata.visibility !== 'public' || metadata.disabled) throw new Error('Repository must be publicly accessible.');
    if (metadata.size > policy.maxRepositoryKB) throw new Error('Repository exceeds the automatic review size limit (100 MB).');
    const head = await api<{ sha: string }>(`/commits/${encodeURIComponent(metadata.default_branch)}`);
    if (!/^[a-f0-9]{40}$/.test(head.sha)) throw new Error('Unable to resolve repository revision.');
    const tree = await api<{ truncated: boolean; tree: TreeEntry[] }>(`/git/trees/${head.sha}?recursive=1`);
    if (tree.truncated || !Array.isArray(tree.tree) || tree.tree.length > policy.maxTreeEntries) throw new Error('Repository tree is too large for complete automatic checks.');
    const read = async (name: string) => {
      const entry = tree.tree.find(p => p.path.toLowerCase() === name.toLowerCase());
      if (!entry || entry.type !== 'blob' || entry.mode === '120000') return '';
      if (!Number.isFinite(entry.size) || entry.size! > policy.maxDocumentBytes) throw new Error(`${name} exceeds the document size limit.`);
      const blob = await api<{ content: string; encoding: string }>(`/git/blobs/${entry.sha}`);
      if (blob.encoding !== 'base64') throw new Error(`Unable to read ${name}.`);
      const content = Buffer.from(blob.content, 'base64');
      if (content.length > policy.maxDocumentBytes) throw new Error(`${name} exceeds the document size limit.`);
      return content.toString('utf8');
    };
    const licensePath = tree.tree.find(p => /^licen[sc]e(?:\.md|\.txt)?$/i.test(p.path))?.path;
    const [readme, gitignore, report, licenseText] = await Promise.all([read('README.md'), read('.gitignore'), read('TEST_REPORT.json'), licensePath ? read(licensePath) : Promise.resolve('')]);
    let license = '';
    if (licensePath) {
      const data = await api<{ sha: string; license?: { spdx_id: string } }>(`/license?ref=${head.sha}`);
      if (data.sha !== tree.tree.find(p => p.path === licensePath)?.sha) throw new Error('License detection did not match the inspected revision.');
      license = data.license?.spdx_id ?? '';
    }
    const result = inspectSnapshot({ repoUrl, repositoryId: metadata.id, commit: head.sha, license, files: tree.tree, readme, gitignore, report, licenseText });
    if (result.testedCommit && /^[a-f0-9]{40}$/.test(result.testedCommit) && result.testedCommit !== head.sha) {
      const comparison = await api<{ status: string; total_commits: number; files?: { filename: string; previous_filename?: string }[] }>(`/compare/${result.testedCommit}...${head.sha}`);
      if (comparison.status !== 'ahead' || comparison.total_commits !== 1 || !comparison.files?.length || comparison.files.some(file => file.filename !== 'TEST_REPORT.json' || (file.previous_filename && file.previous_filename !== 'TEST_REPORT.json'))) result.errors.push('Test evidence is stale: since testedCommit, only one commit changing TEST_REPORT.json is allowed. Retest the current code.');
    }
    if (metadata.archived) result.warnings.push('Repository is archived; reviewer must check the declared maintenance status.');
    result.pass = result.errors.length === 0;
    return result;
  } catch (error) { return { pass: false, errors: [error instanceof Error ? error.message : 'Repository validation unavailable.'], warnings: [] }; }
}
