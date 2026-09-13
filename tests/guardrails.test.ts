import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { canonicalRepoUrl, sourceAtRevision, submissionErrors } from '../src/lib/submissionPolicy.ts';
import { inspectSnapshot, validateRepository } from '../server/repoValidator.ts';
import type { Snapshot, TreeEntry } from '../server/repoValidator.ts';
import { createSubmissionServer } from '../server/api.ts';
import type { Dependencies } from '../server/api.ts';

const sha = 'a'.repeat(40), parent = 'b'.repeat(40);
const report = {
  testedCommit: parent, testedAt: '2026-01-01T00:00:00Z', environment: 'Node 22 on Ubuntu 24.04', command: 'npm test',
  limitations: 'Manual browser testing excludes Safari; mobile layout still experimental.',
  results: [{ name: 'Create a focus session', expected: 'Session appears in the daily schedule.', actual: 'New session appeared with the requested start time.', status: 'passed' }],
};
const readme = '# Focus tool\n## Purpose\nA small scheduling tool for people who want to reserve distraction-free time for writing and studying.\n## Installation\nInstall Node 22, run npm ci, then npm run dev and open the displayed local address.\n## Usage\nCreate a session with a start time and duration. Save it and confirm that it appears in the daily schedule.\n## Limitations\nData is stored locally; browser storage clearing removes sessions. There is no multi-device sync yet.';
function entry(path: string): TreeEntry { return { path, type: 'blob', mode: '100644', size: 1000, sha: path }; }
const snapshot: Snapshot = { repoUrl: 'https://github.com/person/focus', repositoryId: 123, commit: sha, license: 'MIT', readme,
  licenseText: 'Permission is hereby granted '.repeat(15), gitignore: '.env\nnode_modules/', report: JSON.stringify(report),
  files: ['README.md', 'LICENSE.md', '.gitignore', 'TEST_REPORT.json', 'src/main.ts'].map(entry),
};
const payload = { name: 'Focus app', category: 'Productivity', repo_url: snapshot.repoUrl, app_url: '', short_description: 'A tool for scheduling focused work.', long_description: readme,
  project_status: 'experimental', sharing_consent: true, tags: [], tech_stack: [], community_links: [] };

test('canonical repository identities reject private hosts, credentials, branches and URL tricks', () => {
  assert.equal(canonicalRepoUrl(' https://GitHub.com/Person/Focus.git/ '), snapshot.repoUrl);
  for (const url of ['', 'http://github.com/a/b', 'https://github.com.evil/a/b', 'https://github.com@evil/a/b', 'https://localhost/a/b', 'file:///etc/passwd', 'https://github.com/a/b?x=y', 'https://github.com/a/b/tree/main', 'https://github.com/a/..', 'https://github.com/a/%2e%2e']) assert.throws(() => canonicalRepoUrl(url));
});
test('demo-only and missing consent/status cannot bypass shared checks', () => {
  assert.deepEqual(submissionErrors(payload), []);
  assert.ok(submissionErrors({ ...payload, repo_url: '', app_url: 'https://example.org' }).length);
  assert.ok(submissionErrors({ ...payload, sharing_consent: false }).length);
  assert.ok(submissionErrors({ ...payload, project_status: 'perfect' }).length);
  assert.ok(submissionErrors({ ...payload, community_links: [{platform: 'slack', url: 'javascript:alert(1)'}] }).length);
});
test('approved source links are immutable, legacy links remain unchanged', () => {
  assert.equal(sourceAtRevision('https://github.com/Person/Focus.git', sha), snapshot.repoUrl + '/tree/' + sha);
  assert.equal(sourceAtRevision(snapshot.repoUrl), snapshot.repoUrl);
  assert.equal(sourceAtRevision(snapshot.repoUrl, '../../main'), snapshot.repoUrl);
});
test('valid manual/automated evidence qualifies for review, not a quality badge', () => {
  const result = inspectSnapshot(snapshot);
  assert.equal(result.pass, true);
  assert.ok(result.warnings.some(w => w.includes('not executed')));
  assert.ok(result.warnings.some(w => w.includes('CONTRIBUTING.md')));
});
test('missing/empty licenses, stub README and fake test reports are blocked', () => {
  for (const change of [{ licenseText: '' }, { license: 'NOASSERTION' }, { readme: '# Purpose\nTODO' }, { report: 'all tests pass' }, { report: '{}' }, { report: JSON.stringify({ ...report, results: [] }) }, { report: JSON.stringify({ ...report, testedAt: '2999-01-01' }) }, { report: JSON.stringify({ ...report, results: [{ ...report.results[0], actual: 'TODO' }] }) }]) assert.equal(inspectSnapshot({ ...snapshot, ...change }).pass, false);
});
test('nested sensitive filenames and symlinks fail; sample env allowed', () => {
  for (const file of [entry('backend/.env.production'), {...entry('README.md'), mode:'120000'}, {...entry('vendor/module'), type:'commit'}, entry('keys/private.key')]) assert.equal(inspectSnapshot({...snapshot, files:[...snapshot.files,file]}).pass,false);
  assert.equal(inspectSnapshot({...snapshot, files:[...snapshot.files,entry('backend/.env.example')]}).pass,true);
});
test('failed tests are disclosed without preventing honest experimental submissions', () => {
  const result = inspectSnapshot({...snapshot, report:JSON.stringify({...report,results:[...report.results,{...report.results[0],status:'failed'}]})});
  assert.equal(result.pass,true); assert.ok(result.warnings.some(w=>w.includes('Failed/skipped')));
});

function githubMock(options: { private?: boolean; truncated?: boolean; changedFile?: string; fail?: boolean } = {}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input); assert.ok(url.startsWith('https://api.github.com/repos/person/focus'));
    if(options.fail) return new Response('{}',{status:503});
    const suffix = url.replace('https://api.github.com/repos/person/focus','');
    let body: unknown;
    if (!suffix) body = {id:123,private:options.private??false,visibility:'public',size:50,default_branch:'main'};
    else if(suffix.startsWith('/commits/')) body={sha};
    else if(suffix.startsWith('/git/trees/')) body={truncated:options.truncated??false,tree:snapshot.files};
    else if(suffix.startsWith('/license')) body={sha:'LICENSE.md',license:{spdx_id:'MIT'}};
    else if(suffix.startsWith('/compare/')) body={status:'ahead',total_commits:1,files:[{filename:options.changedFile??'TEST_REPORT.json'}]};
    else {
      const contents: Record<string,string> = {'README.md':readme,'LICENSE.md':snapshot.licenseText,'.gitignore':snapshot.gitignore,'TEST_REPORT.json':snapshot.report};
      const content=contents[suffix.replace('/git/blobs/','')]; assert.notEqual(content,undefined);
      body={encoding:'base64',content:Buffer.from(content).toString('base64')};
    }
    return new Response(JSON.stringify(body));
  }) as typeof fetch;
}
test('GitHub snapshot is pinned; report-only follow-up passes but code change invalidates evidence', async () => {
  assert.equal((await validateRepository(snapshot.repoUrl,githubMock())).pass,true);
  const stale=await validateRepository(snapshot.repoUrl,githubMock({changedFile:'src/main.ts'}));
  assert.equal(stale.pass,false); assert.ok(stale.errors.some(e=>e.includes('stale')));
});
test('private repos, incomplete trees and GitHub failure fail closed',async()=>{
  for(const options of [{private:true},{truncated:true},{fail:true}]) assert.equal((await validateRepository(snapshot.repoUrl,githubMock(options))).pass,false);
});

async function apiTest(overrides: Partial<Dependencies>, callback:(base:string,rows:Record<string,unknown>[])=>Promise<void>) {
  const rows:Record<string,unknown>[]=[];
  const server=createSubmissionServer({authenticate:async()=>({id:'real-user',name:'Builder'}),validate:async()=>inspectSnapshot(snapshot),exists:async()=>false,insert:async(row)=>{rows.push(row);return 'created';},...overrides},'https://openvibes.vercel.app');
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const address=server.address(); assert.ok(address&&typeof address!=='string');
  try {await callback(`http://127.0.0.1:${address.port}`,rows);} finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
const post=(base:string,body:unknown,headers:Record<string,string>={})=>fetch(base+'/submit-app',{method:'POST',headers:{Authorization:'Bearer valid','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('API ignores spoofed author, publication status and validation report',async()=>{
  await apiTest({},async(base,rows)=>{
    const res=await post(base,{...payload,author_id:'attacker',moderation_status:'published',upvotes:9000,validated_commit:'fake',validation_report:{pass:true}});
    assert.equal(res.status,201);assert.equal(rows.length,1);assert.equal(rows[0].author_id,'real-user');assert.equal(rows[0].moderation_status,'pending_review');assert.equal(rows[0].validated_commit,sha);assert.equal(rows[0].upvotes,undefined);
  });
});
test('authentication, invalid input and failed validation cannot insert',async()=>{
  await apiTest({authenticate:async()=>null},async(base,rows)=>{assert.equal((await post(base,payload)).status,401);assert.equal(rows.length,0);});
  await apiTest({},async(base,rows)=>{assert.equal((await post(base,{...payload,repo_url:''})).status,422);assert.equal((await post(base,payload,{Origin:'https://evil.example'})).status,403);assert.equal(rows.length,0);});
  await apiTest({validate:async()=>({pass:false,errors:['Missing report'],warnings:[]})},async(base,rows)=>{assert.equal((await post(base,payload)).status,422);assert.equal(rows.length,0);});
  await apiTest({validate:async()=>{throw Error('private backend detail');}},async(base,rows)=>{const res=await post(base,payload);assert.equal(res.status,503);assert.ok(!(await res.text()).includes('private backend detail'));assert.equal(rows.length,0);});
});
test('duplicates and concurrent unique constraint conflicts return 409',async()=>{
  await apiTest({exists:async()=>true},async(base,rows)=>{assert.equal((await post(base,payload)).status,409);assert.equal(rows.length,0);});
  await apiTest({insert:async()=>'duplicate'},async(base)=>{assert.equal((await post(base,payload)).status,409);});
});
test('oversized bodies and per-user flooding are rejected',async()=>{
  await apiTest({},async(base,rows)=>{
    assert.equal((await post(base,{junk:'x'.repeat(70000)})).status,413);
    for(let n=0;n<4;n++) await post(base,{});
    assert.equal((await post(base,payload)).status,429);assert.equal(rows.length,0);
  });
});
