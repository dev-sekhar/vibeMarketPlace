import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { CITATION_BLOCKED_WORDS, CITATION_BLOCKED_PHRASES, CITATION_PROFANITY_MESSAGE, CITATION_PROFANITY_PATTERN, containsCitationProfanity, citationSaveError } from '../src/lib/citationLanguage.ts';
import { citationError } from '../src/lib/citations.ts';

const blocked = [...CITATION_BLOCKED_WORDS, ...CITATION_BLOCKED_PHRASES, 'FUCK!', 'sh!t', 'f.u.c.k', 'f u c k', 'a55hole', 'fuuucking', 'ｆｕｃｋ', 'f\u200buck'];
const allowed = ['Scunthorpe', 'The classic assessment was useful.', 'We used a shell script.', 'Dick Smith', 'The app lost my data. I cannot recommend it until exports work.', 'This is not useful for my workflow.', 'The reputation of this tool depends on fixing crashes.'];
const draft = {display_name:'Sam Builder',use_case:'I used this app for weekly planning with my team.',feedback:'The app lost my data. I cannot recommend it until exports work.',recommendation:'not_recommended',evidence_url:'',has_used:true};

test('citation language checks catch common disguises without suppressing negative feedback or word substrings', () => {
    for (const text of blocked) assert.equal(containsCitationProfanity(text), true, text);
    for (const text of allowed) assert.equal(containsCitationProfanity(text), false, text);
    assert.equal(citationError(draft), null);
    for (const field of ['display_name','use_case','feedback']) assert.equal(citationError({...draft,[field]:'This is fucking broken.'}), CITATION_PROFANITY_MESSAGE);
    assert.equal(citationSaveError({code:'P0001',message:'CITATION_PROFANITY: rejected'}), CITATION_PROFANITY_MESSAGE);
    assert.match(citationSaveError({code:'23505'}), /already have a citation/);
    assert.doesNotMatch(citationSaveError({message:'private database details'}), /private database details/);
});

test('database rejects direct insert/update and unhiding matches, while preserving hidden legacy rows and RLS', async () => {
    const db = new PGlite();
    const creator='11111111-1111-4111-8111-111111111111';
    const writer='22222222-2222-4222-8222-222222222222';
    const second='33333333-3333-4333-8333-333333333333';
    const app='44444444-4444-4444-8444-444444444444';
    const migration=readFileSync(new URL('../docs/citation_language_migration.sql',import.meta.url),'utf8');
    assert.ok(migration.includes(`$pattern$${CITATION_PROFANITY_PATTERN}$pattern$`), 'Regenerate SQL when the shared vocabulary changes.');
    try {
        await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
            CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
            INSERT INTO auth.users VALUES ('${creator}'),('${writer}'),('${second}');
            CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
            GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
            CREATE TABLE public.apps(id uuid PRIMARY KEY,author_id uuid NOT NULL);
            INSERT INTO public.apps VALUES('${app}','${creator}');
            GRANT SELECT ON public.apps TO anon,authenticated;`);
        await db.exec(readFileSync(new URL('../docs/app_citations_migration.sql',import.meta.url),'utf8'));
        const insert = (feedback: string) => db.query('INSERT INTO app_citations(app_id,display_name,use_case,feedback,recommendation,has_used) VALUES($1,$2,$3,$4,$5,true)',[app,draft.display_name,draft.use_case,feedback,draft.recommendation]);
        await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${writer}',false);`);
        await insert('This fucking app lost my data during export.');
        await db.exec('RESET ROLE;');
        await db.exec(migration);
        await db.exec(migration);
        assert.equal((await db.query<{is_hidden:boolean}>('SELECT is_hidden FROM app_citations')).rows[0].is_hidden,true);
        assert.equal((await db.query<{feedback:string}>('SELECT feedback FROM app_citations')).rows[0].feedback,'This fucking app lost my data during export.');
        for (const text of [...blocked,...allowed]) {
            const result=await db.query<{match:boolean}>('SELECT public.citation_contains_profanity($1) AS match',[text]);
            assert.equal(result.rows[0].match, containsCitationProfanity(text), `SQL/client parity: ${text}`);
        }
        await assert.rejects(db.exec('UPDATE app_citations SET is_hidden=false'),/CITATION_PROFANITY/);
        await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${writer}',false);`);
        await assert.rejects(db.query('UPDATE app_citations SET feedback=$1',['Still f.u.c.k.i.n.g broken after updating the app.']),/CITATION_PROFANITY/);
        await db.query('UPDATE app_citations SET feedback=$1',[draft.feedback]);
        assert.equal((await db.query<{is_hidden:boolean}>('SELECT is_hidden FROM app_citations')).rows[0].is_hidden,true);
        await assert.rejects(db.exec('UPDATE app_citations SET is_hidden=false'),/permission denied/);
        await db.exec(`SELECT set_config('request.jwt.claim.sub','${second}',false);`);
        await assert.rejects(insert('This f u c k i n g tool failed to export my data.'),/CITATION_PROFANITY/);
        await insert(draft.feedback);
        await assert.rejects(db.query('UPDATE app_citations SET display_name=$1',['a55hole']),/CITATION_PROFANITY/);
        await assert.rejects(db.query('UPDATE app_citations SET use_case=$1',['This is a shitty planning experience for our team.']),/CITATION_PROFANITY/);
        await db.exec('RESET ROLE; SET ROLE anon;');
        assert.equal((await db.query('SELECT id FROM app_citations')).rows.length,1);
    } finally { await db.close(); }
});
