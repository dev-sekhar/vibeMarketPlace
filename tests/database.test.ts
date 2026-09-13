import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('real SQL migration blocks direct writes, hides pending rows, preserves legacy rows and voting', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '11111111-1111-4111-8111-111111111111'::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
      CREATE SCHEMA storage;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
    `);
    await db.exec(readFileSync(new URL('../docs/supabase_schema.sql', import.meta.url),'utf8'));
    const legacy = '22222222-2222-4222-8222-222222222222';
    await db.exec(`INSERT INTO public.apps (id,name,slug,short_description,long_description,category,repo_url,app_url,author_id)
      VALUES ('${legacy}','Legacy','legacy','Old app','Old description','Productivity','https://github.com/Owner/Old.git/','','11111111-1111-4111-8111-111111111111');`);
    await db.exec(readFileSync(new URL('../docs/submission_guardrails_migration.sql', import.meta.url),'utf8'));
    await db.exec('GRANT SELECT ON public.apps TO anon,authenticated; GRANT SELECT,INSERT,DELETE ON public.upvotes TO authenticated;');
    const base = `name,slug,short_description,long_description,category,repo_url,app_url,author_id`;
    const values = `'New app','new-app','Useful project','A longer description','Productivity','https://github.com/owner/new','','11111111-1111-4111-8111-111111111111'`;
    await assert.rejects(db.exec(`INSERT INTO apps (${base}) VALUES (${values});`), /Validated repository/);
    await db.exec(`INSERT INTO apps (${base},sharing_consent,repository_id,validated_commit,validation_report) VALUES (${values},true,123,'${'a'.repeat(40)}','{"pass":true}');`);
    await db.exec('SET ROLE anon;');
    assert.equal((await db.query('SELECT * FROM apps')).rows.length,1);
    await db.exec('RESET ROLE; SET ROLE authenticated;');
    await assert.rejects(db.exec(`INSERT INTO apps (${base}) VALUES (${values});`), /permission denied/);
    await assert.rejects(db.exec(`UPDATE apps SET moderation_status='published' WHERE slug='new-app';`), /permission denied/);
    // Voting remains functional despite app UPDATE privilege revocation.
    await db.exec(`INSERT INTO upvotes(app_id,user_id) VALUES ('${legacy}','11111111-1111-4111-8111-111111111111');`);
    await db.exec('RESET ROLE;');
    assert.equal((await db.query<{upvotes:number}>(`SELECT upvotes FROM apps WHERE id='${legacy}'`)).rows[0].upvotes,1);
    await db.exec(`SET ROLE authenticated; DELETE FROM upvotes WHERE app_id='${legacy}'; RESET ROLE;`);
    assert.equal((await db.query<{upvotes:number}>(`SELECT upvotes FROM apps WHERE id='${legacy}'`)).rows[0].upvotes,0);
    // Even accidentally restoring table grants does not reopen bypasses.
    await db.exec('GRANT INSERT,UPDATE ON apps TO authenticated; SET ROLE authenticated;');
    await assert.rejects(db.exec(`INSERT INTO apps (${base},sharing_consent,repository_id,validated_commit,validation_report) VALUES (${values},true,456,'${'b'.repeat(40)}','{"pass":true}');`));
    const update = await db.query(`UPDATE apps SET moderation_status='published' WHERE slug='new-app' RETURNING id;`);
    assert.equal(update.rows.length,0);
    await db.exec('RESET ROLE;');
    assert.equal((await db.query<{repo_key:string}>('SELECT repo_key FROM apps WHERE slug=\'legacy\'')).rows[0].repo_key,'https://github.com/owner/old');
    await assert.rejects(db.exec(`INSERT INTO apps (${base},sharing_consent,repository_id,validated_commit,validation_report) VALUES (${values.replace("'new-app'","'duplicate'")},true,123,'${'a'.repeat(40)}','{"pass":true}');`), /duplicate key/);
    await db.exec("SET ROLE service_role; UPDATE apps SET moderation_status='published' WHERE slug='new-app'; RESET ROLE; SET ROLE anon;");
    assert.equal((await db.query('SELECT * FROM apps')).rows.length,2);
  } finally { await db.close(); }
});
