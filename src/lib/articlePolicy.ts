/** Stable identity, shared with canonical_article_key() in the SQL migration. */
export function articleKey(value: string): string | null {
  const match = value.trim().match(/^https?:\/\/([a-z0-9.-]+(?::[0-9]+)?)(\/[^?#\s\\]*)?(?:\?([^#\s\\]*))?(?:#[^\s\\]*)?$/i);
  if (!match || value.trim().length > 2048) return null;
  const host = match[1].toLowerCase().replace(/^www\./, '').replace(value.trim().toLowerCase().startsWith('https:') ? /:443$/ : /:80$/, '');
  const path = (match[2] || '').replace(/\/+$/, '');
  if (host === 'medium.com' || host.endsWith('.medium.com')) {
    const id = path.match(/(?:-|\/)([a-f0-9]{12})$/i);
    if (id) return `medium:${id[1].toLowerCase()}`;
  }
  if (host === 'linkedin.com') {
    const id = path.match(/(?:activity-|activity:|share-)([0-9]+)/);
    if (id) return `linkedin:activity:${id[1]}`;
  }
  const query = (match[3] || '').split('&').filter(p => p && !/^(utm_[^=]*|source|ref|referrer|fbclid|gclid|mc_cid|mc_eid|trk|trackingid|share|rcm|r)=/i.test(p)).sort().join('&');
  return host + path + (query ? '?' + query : '');
}
export function publicName(...values: unknown[]): string {
  return values.find((v): v is string => typeof v === 'string' && !!v.trim() && !/\S+@\S+\.\S+/.test(v))?.trim() || '';
}
export function uniqueArticles<T extends { id: string; external_url: string; created_at: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  // Preserve the original share, consistently with database cleanup.
  return [...items].sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)).filter(item => {
    const key = articleKey(item.external_url) || item.id;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
}
