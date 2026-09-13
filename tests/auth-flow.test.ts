import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnPath, withTimeout, oauthErrorMessage } from '../src/lib/authFlow.ts';
import { validRequirementsConsent, REQUIREMENTS_VERSION } from '../src/lib/requirementsConsent.ts';
test('OAuth return path cannot become an open redirect', () => {
  assert.equal(safeReturnPath('/submit'), '/submit');
  for (const path of ['https://evil.example','//evil.example','/\\evil.example','/submit?next=https://evil.example',null]) assert.equal(safeReturnPath(path), '/');
});
test('OAuth failures produce useful messages without reflecting token-bearing descriptions', () => {
  assert.match(oauthErrorMessage('?error=access_denied','')!,/cancelled or denied/);
  assert.ok(!oauthErrorMessage('','#error=server_error&error_description=secret-token')!.includes('secret-token'));
  assert.equal(oauthErrorMessage('',''),null);
});
test('stalled auth operations time out; resolved values and errors propagate', async () => {
  await assert.rejects(withTimeout(new Promise(()=>{}),10),/taking too long/);
  assert.equal(await withTimeout(Promise.resolve('session'),20),'session');
  await assert.rejects(withTimeout(Promise.reject(Error('provider rejected')),20),/provider rejected/);
});
test('requirements agreement survives OAuth but expires and is invalidated by policy changes', () => {
  const now=10000000;
  assert.equal(validRequirementsConsent(JSON.stringify({version:REQUIREMENTS_VERSION,acceptedAt:now-1000}),now),true);
  for(const data of [null,'bad',JSON.stringify({version:'old',acceptedAt:now}),JSON.stringify({version:REQUIREMENTS_VERSION,acceptedAt:now+1}),JSON.stringify({version:REQUIREMENTS_VERSION,acceptedAt:now-1800000})]) assert.equal(validRequirementsConsent(data,now),false);
});
