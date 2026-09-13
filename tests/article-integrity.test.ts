import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { articleKey, publicName, uniqueArticles } from '../src/lib/articlePolicy';

const variants = [
 ['https://www.medium.com/@sam/a-story-abcdef123456?source=share#top','http://sam.medium.com/new-title-abcdef123456/'],
 ['https://www.linkedin.com/posts/sam_test-activity-123456789-share?utm_source=x','https://linkedin.com/feed/update/urn:li:activity:123456789/'],
 ['https://writer.substack.com/p/story?utm_campaign=email&r=123','https://writer.substack.com/p/story/'],
 ['https://example.com/read?id=1&utm_source=x&lang=en','http://www.example.com/read/?lang=en&id=1#top'],
];
test('article identity ignores tracking and known platform URL aliases without merging distinct articles', () => {
 for (const [a,b] of variants) assert.equal(articleKey(a), articleKey(b));
 assert.notEqual(articleKey('https://example.com/read?id=1'),articleKey('https://example.com/read?id=2'));
 assert.notEqual(articleKey('https://writer.substack.com/p/one'),articleKey('https://writer.substack.com/p/two'));
 for (const url of ['javascript:alert(1)','https://user:secret@example.com/x','https://example.com/a b']) assert.equal(articleKey(url),null);
 assert.equal(publicName('person@example.com','Sam Builder'),'Sam Builder');
 assert.equal(publicName('person@example.com'),'');
 const items = [{id:'new',external_url:variants[0][0],created_at:'2026-09-12'},{id:'old',external_url:variants[0][1],created_at:'2026-09-01'}];
 assert.deepEqual(uniqueArticles(items).map(i=>i.id),['old']);
});

test('article migration archives existing duplicates, recovers names and enforces uniqueness across users', async () => {
 const db = new PGlite();
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_user_meta_data jsonb);
    INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111','{"name":"Sam Builder"}'),('22222222-2222-4222-8222-222222222222','{}');
    CREATE TABLE public.whitepapers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text DEFAULT '', description text DEFAULT '', created_at timestamptz DEFAULT now(), external_url text NOT NULL, author_id uuid, author_name text NOT NULL, is_own_article boolean DEFAULT false);
    INSERT INTO whitepapers(external_url,author_id,author_name,is_own_article,created_at) VALUES
    ('https://writer.substack.com/p/story','11111111-1111-4111-8111-111111111111','person@example.com',true,'2026-09-01'),
    ('https://writer.substack.com/p/story?utm_source=email','22222222-2222-4222-8222-222222222222','Second Person',false,'2026-09-02');`);
  await db.exec(`INSERT INTO whitepapers(id,title,description,external_url,author_name) VALUES
   ('7982110e-622c-428b-9e16-62e8a3dbe47a','The End of the SaaS CRM','Why Building Your Own Is the Smarter Choice','','chandra t'),
   ('2801b84f-4d11-41bc-8cc9-39cb11dd3265','The End of the SaaS CRM','Why Building Your Own Is the Smarter Choice','https://medium.com/@chandrasekharturlapati/story-d13852852e49','Sam Builder');`);
  // Reproduce the production schema: a legacy trigger outlived its column.
  await db.exec(`CREATE FUNCTION public.update_whitepapers_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;
    CREATE TRIGGER legacy_timestamp BEFORE UPDATE ON public.whitepapers FOR EACH ROW EXECUTE FUNCTION public.update_whitepapers_updated_at();`);
  await assert.rejects(db.exec('UPDATE public.whitepapers SET author_name=author_name'), /has no field "updated_at"/);
  await db.exec(readFileSync(new URL('../docs/article_integrity_migration.sql', import.meta.url),'utf8'));
  assert.equal((await db.query("SELECT id FROM whitepapers WHERE article_key='writer.substack.com/p/story' AND updated_at IS NOT NULL")).rows.length,1);
  for (const pair of variants) for (const url of pair) {
    const { rows }=await db.query<{key:string}>('SELECT public.canonical_article_key($1) AS key',[url]);
    assert.equal(rows[0].key,articleKey(url));
  }
  const rows = (await db.query<{author_name:string;article_author_name:string}>("SELECT * FROM whitepapers WHERE article_key='writer.substack.com/p/story'")).rows;
  assert.equal(rows.length,1); assert.equal(rows[0].author_name,'Sam Builder'); assert.equal(rows[0].article_author_name,'Sam Builder');
  assert.equal((await db.query('SELECT * FROM whitepaper_duplicate_archive')).rows.length,2);
  assert.equal((await db.query("SELECT * FROM whitepapers WHERE id='7982110e-622c-428b-9e16-62e8a3dbe47a'")).rows.length,0);
  await db.exec('GRANT SELECT, INSERT ON whitepapers TO authenticated; SET ROLE authenticated;');
  await assert.rejects(db.exec(`INSERT INTO whitepapers(external_url,author_id,author_name,article_author_name) VALUES ('http://writer.substack.com/p/story/','22222222-2222-4222-8222-222222222222','Another User','Sam Builder')`), /duplicate key/);
  await assert.rejects(db.exec(`INSERT INTO whitepapers(external_url,author_name,article_author_name) VALUES ('https://example.com/new','private@example.com','Sam Builder')`), /public display name/);
  await assert.rejects(db.exec('SELECT * FROM whitepaper_duplicate_archive'), /permission denied/);
  await db.exec(`INSERT INTO whitepapers(external_url,author_name,article_author_name) VALUES ('https://example.com/distinct','Another User','Sam Builder'); RESET ROLE;`);
 } finally { await db.close(); }
});
