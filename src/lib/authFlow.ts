export function safeReturnPath(value: string | null | undefined): string {
  return ['/submit', '/profile', '/whitepapers'].includes(value ?? '') ? value! : '/';
}
export async function withTimeout<T>(work: Promise<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([work, new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Sign-in is taking too long. Retry, or close other OpenVibes tabs and try a private browser window.')), milliseconds);
  })]); } finally { if (timer) clearTimeout(timer); }
}
export function oauthErrorMessage(search: string, hash: string): string | null {
  const query = new URLSearchParams(search), fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const error = query.get('error') ?? fragment.get('error');
  if (!error && !query.has('error_description') && !fragment.has('error_description')) return null;
  return error === 'access_denied' ? 'GitHub sign-in was cancelled or denied. You can try again.' : 'GitHub could not complete sign-in. Retry or contact the OpenVibes maintainer.';
}
