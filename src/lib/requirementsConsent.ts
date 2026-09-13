export const REQUIREMENTS_VERSION = '2026-09-13-v2';
export const CONSENT_KEY = 'openvibes-submission-requirements';
export function validRequirementsConsent(raw: string | null, now = Date.now()): boolean {
  try { const data = JSON.parse(raw ?? 'null'); return data?.version === REQUIREMENTS_VERSION && Number.isFinite(data.acceptedAt) && data.acceptedAt <= now && now - data.acceptedAt < 30 * 60 * 1000; } catch { return false; }
}
export function rememberRequirements(): void {
  try { sessionStorage.setItem(CONSENT_KEY, JSON.stringify({version:REQUIREMENTS_VERSION,acceptedAt:Date.now()})); } catch { /* In-memory agreement still works. */ }
}
export function forgetRequirements(): void {
  try { sessionStorage.removeItem(CONSENT_KEY); } catch { /* Storage may be disabled. */ }
}
