import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { citationError } from '../src/lib/citations';
import { safeReturnPath } from '../src/lib/authFlow';

test('citations require first-hand context, substantive feedback and safe optional evidence links', () => {
 const draft = { display_name:'Sam Builder',use_case:'I used this app to organize my weekly team planning.',feedback:'The basic workflow was useful. An export option would make it easier to use with our existing tools.',recommendation:'mixed',evidence_url:'',has_used:true };
 assert.equal(citationError(draft),null);
 for (const change of [{display_name:'sam@example.com'},{use_case:'Great app'},{feedback:'Nice!'},{has_used:false},{recommendation:'toString'},{evidence_url:'javascript:alert(1)'},{evidence_url:'https://name:secret@example.com'}]) assert.ok(citationError({...draft,...change}));
 assert.equal(citationError({...draft,evidence_url:'https://example.com/project?version=2#demo'}),null);
 assert.equal(safeReturnPath('/app/my-project'),'/app/my-project');
 for (const url of ['/app/../login','//example.com','/app/test?next=https://example.com','/app/%2fexample.com']) assert.equal(safeReturnPath(url),'/');
});

test('citation policies enforce ownership, one per user/app, moderation, and public app visibility', async () => {
 const db = new PGlite();
 const creator='11111111-1111-4111-8111-111111111111';
 const first='22222222-2222-4222-8222-222222222222';
 const second='33333333-3333-4333-8333-333333333333';
 const app='44444444-4444-4444-8444-444444444444';
 const fields='app_id,display_name,use_case,feedback,recommendation,has_used';
 const values=`'${app}','Sam Builder','I used this app for weekly planning with my team.','It worked well for planning. I would recommend improving exports and keyboard navigation.','mixed',true`;
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
   CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
   INSERT INTO auth.users VALUES ('${creator}'),('${first}'),('${second}');
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
   CREATE TABLE public.apps(id uuid PRIMARY KEY,author_id uuid NOT NULL,is_public boolean NOT NULL DEFAULT true);
   INSERT INTO public.apps(id,author_id) VALUES ('${app}','${creator}');
   ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
   CREATE POLICY apps_read ON public.apps FOR SELECT USING(is_public);
   GRANT SELECT ON public.apps TO anon,authenticated;`);
  const migration=readFileSync(new URL('../docs/app_citations_migration.sql',import.meta.url),'utf8');
  await db.exec(migration);
  await db.exec(migration); // Deployment retry does not reset submitted rows or grants.
  await db.exec('SET ROLE anon;');
  await assert.rejects(db.exec(`INSERT INTO app_citations(${fields}) VALUES (${values});`),/permission denied/);
  await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${first}',false);`);
  await db.exec(`INSERT INTO app_citations(${fields}) VALUES (${values});`);
  assert.equal((await db.query<{user_id:string}>('SELECT user_id FROM app_citations')).rows[0].user_id,first);
  await assert.rejects(db.exec(`INSERT INTO app_citations(${fields}) VALUES (${values});`),/duplicate key/);
  await assert.rejects(db.exec(`INSERT INTO app_citations(${fields},user_id) VALUES (${values},'${second}');`),/permission denied/);
  await assert.rejects(db.exec('UPDATE app_citations SET is_hidden=true;'),/permission denied/);
  await assert.rejects(db.exec(`UPDATE app_citations SET app_id='${app}';`),/permission denied/);
  await assert.rejects(db.exec(`UPDATE app_citations SET has_used=false;`),/check constraint/);
  await assert.rejects(db.exec(`UPDATE app_citations SET display_name='private@example.com';`),/check constraint/);
  await assert.rejects(db.exec(`UPDATE app_citations SET evidence_url='javascript:alert(1)';`),/check constraint/);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${creator}',false);`);
  await assert.rejects(db.exec(`INSERT INTO app_citations(${fields}) VALUES (${values});`),/row-level security/);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${second}',false);`);
  assert.equal((await db.query("UPDATE app_citations SET recommendation='recommend' RETURNING id")).rows.length,0);
  assert.equal((await db.query('DELETE FROM app_citations RETURNING id')).rows.length,0);
  await db.exec(`INSERT INTO app_citations(${fields}) VALUES (${values.replace("'mixed'","'not_recommended'")});`);
  await db.exec(`RESET ROLE; UPDATE app_citations SET is_hidden=true WHERE user_id='${first}'; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE anon;`);
  assert.equal((await db.query('SELECT * FROM app_citations')).rows.length,1);
  await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${first}',false);`);
  assert.equal((await db.query('SELECT * FROM app_citations')).rows.length,2);
  await db.exec("UPDATE app_citations SET recommendation='recommend';");
  assert.equal((await db.query<{is_hidden:boolean}>(`SELECT is_hidden FROM app_citations WHERE user_id='${first}'`)).rows[0].is_hidden,true);
  await db.exec(`RESET ROLE; UPDATE apps SET is_public=false; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE anon;`);
  assert.equal((await db.query('SELECT * FROM app_citations')).rows.length,0);
  await db.exec(`RESET ROLE; UPDATE apps SET is_public=true; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${second}',false);`);
  assert.equal((await db.query('DELETE FROM app_citations RETURNING id')).rows.length,1);
 } finally { await db.close(); }
});
