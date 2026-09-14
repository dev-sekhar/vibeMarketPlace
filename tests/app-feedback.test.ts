import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { feedbackError, feedbackSaveError, FEEDBACK_KINDS, FEEDBACK_STATUSES } from '../src/lib/appFeedback.ts';

const draft={display_name:'Sam Builder',kind:'bug',title:'Export loses the selected date',description:'Choose a date, export the plan and open the file. The selected date should remain, but it is missing.'};
test('feedback validates useful bug/request/improvement text and rejects profanity in each public field',()=>{
    for(const kind of FEEDBACK_KINDS) assert.equal(feedbackError({...draft,kind}),null);
    for(const change of [{display_name:'sam@example.com'},{kind:'other'},{title:'Oops'},{description:'Broken'}]) assert.ok(feedbackError({...draft,...change}));
    for(const field of ['display_name','title','description']) assert.equal(feedbackError({...draft,[field]:'This fucking thing failed.'}),'feedback.errors.language');
    assert.equal(feedbackError({...draft,description:'I cannot recommend this workflow because it lost my data twice. Please add recovery.'}),null);
    assert.equal(feedbackSaveError({message:'FEEDBACK_PROFANITY: rejected'}),'feedback.errors.language');
    assert.equal(feedbackSaveError({code:'23505'}),'feedback.errors.duplicateVote');
});

test('feedback database enforces authorship, one vote per other user, owner statuses, ranking, visibility and profanity',async()=>{
    const db=new PGlite();
    const owner='11111111-1111-4111-8111-111111111111';
    const author='22222222-2222-4222-8222-222222222222';
    const voter='33333333-3333-4333-8333-333333333333';
    const another='55555555-5555-4555-8555-555555555555';
    const app='44444444-4444-4444-8444-444444444444';
    const otherApp='66666666-6666-4666-8666-666666666666';
    const asUser=async(id:string)=>db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
    const insert=async(kind='bug',title=draft.title,description=draft.description,name=draft.display_name)=>db.query<{id:string;user_id:string}>('INSERT INTO app_feedback(app_id,display_name,kind,title,description) VALUES($1,$2,$3,$4,$5) RETURNING id,user_id',[app,name,kind,title,description]);
    const count=async(id:string)=>(await db.query<{vote_count:number}>('SELECT vote_count FROM app_feedback WHERE id=$1',[id])).rows[0]?.vote_count;
    try {
        await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
            CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
            INSERT INTO auth.users VALUES('${owner}'),('${author}'),('${voter}'),('${another}');
            CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
            GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
            CREATE TABLE public.apps(id uuid PRIMARY KEY,author_id uuid NOT NULL,is_public boolean NOT NULL DEFAULT true);
            INSERT INTO public.apps(id,author_id) VALUES('${app}','${owner}'),('${otherApp}','${another}');
            ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
            CREATE POLICY apps_read ON public.apps FOR SELECT USING(is_public);
            GRANT SELECT ON public.apps TO anon,authenticated;`);
        await db.exec(readFileSync(new URL('../docs/app_citations_migration.sql',import.meta.url),'utf8'));
        await db.exec(readFileSync(new URL('../docs/citation_language_migration.sql',import.meta.url),'utf8'));
        const migration=readFileSync(new URL('../docs/app_feedback_migration.sql',import.meta.url),'utf8');
        await db.exec(migration);
        await db.exec('SET ROLE anon;');
        await assert.rejects(insert(),/permission denied/);
        await asUser(author);
        const first=(await insert()).rows[0];
        assert.equal(first.user_id,author);
        const second=(await insert('feature','Add reusable planning presets')).rows[0];
        const third=(await insert('improvement','Improve keyboard navigation')).rows[0];
        assert.equal(await count(first.id),0);
        await assert.rejects(db.query('INSERT INTO app_feedback_votes(feedback_id) VALUES($1)',[first.id]),/row-level security/);
        await assert.rejects(db.query('UPDATE app_feedback SET vote_count=100 WHERE id=$1',[first.id]),/permission denied/);
        await assert.rejects(db.query('UPDATE app_feedback SET user_id=$1',[voter]),/permission denied/);
        await assert.rejects(db.exec('UPDATE app_feedback SET is_hidden=true'),/permission denied/);
        await assert.rejects(db.exec('DELETE FROM app_feedback'),/permission denied/);
        assert.equal((await db.query("UPDATE app_feedback SET status='planned' RETURNING id")).rows.length,0);
        await assert.rejects(insert('bug','This is a fucking broken tool'),/FEEDBACK_PROFANITY/);
        await assert.rejects(insert('bug',draft.title,'This sh!t failed while exporting our monthly planning data.'),/FEEDBACK_PROFANITY/);
        await assert.rejects(insert('bug',draft.title,draft.description,'a55hole'),/FEEDBACK_PROFANITY/);
        await assert.rejects(insert('unknown'),/check constraint/);
        await assert.rejects(db.query('INSERT INTO app_feedback(app_id,display_name,kind,title,description,user_id) VALUES($1,$2,$3,$4,$5,$6)',[app,draft.display_name,'bug',draft.title,draft.description,voter]),/permission denied/);

        await asUser(voter);
        await db.query('INSERT INTO app_feedback_votes(feedback_id) VALUES($1)',[second.id]);
        await assert.rejects(db.query('INSERT INTO app_feedback_votes(feedback_id) VALUES($1)',[second.id]),/duplicate key/);
        assert.equal(await count(second.id),1);
        await assert.rejects(db.query('INSERT INTO app_feedback_votes(feedback_id,user_id) VALUES($1,$2)',[first.id,another]),/permission denied/);
        await asUser(another);
        assert.equal((await db.query('SELECT * FROM app_feedback_votes')).rows.length,0);
        assert.equal((await db.query('DELETE FROM app_feedback_votes RETURNING feedback_id')).rows.length,0);
        await db.query('INSERT INTO app_feedback_votes(feedback_id) VALUES($1)',[second.id]);
        assert.equal(await count(second.id),2);
        // Owning a different app grants no status permissions here.
        assert.equal((await db.query("UPDATE app_feedback SET status='closed' RETURNING id")).rows.length,0);
        await asUser(owner);
        for(const status of FEEDBACK_STATUSES) await db.query('UPDATE app_feedback SET status=$1 WHERE id=$2',[status,second.id]);
        assert.equal(await count(second.id),2);
        await assert.rejects(db.query('UPDATE app_feedback SET title=$1 WHERE id=$2',['Changed title',second.id]),/permission denied/);
        await assert.rejects(db.exec("UPDATE app_feedback SET status='invalid'"),/check constraint/);
        await db.query('INSERT INTO app_feedback_votes(feedback_id) VALUES($1)',[first.id]);
        const ranked=await db.query<{id:string}>('SELECT id FROM app_feedback WHERE app_id=$1 ORDER BY vote_count DESC,created_at DESC,id LIMIT 2',[app]);
        assert.deepEqual(ranked.rows.map(row=>row.id),[second.id,first.id]);

        await db.exec('RESET ROLE;');
        await db.exec(migration); // Retains posts and counts on retry.
        assert.equal(await count(second.id),2);
        await asUser(voter);
        await db.query('DELETE FROM app_feedback_votes WHERE feedback_id=$1',[second.id]);
        assert.equal(await count(second.id),1);
        await db.query('DELETE FROM app_feedback_votes WHERE feedback_id=$1',[second.id]);
        assert.equal(await count(second.id),1);
        await db.exec(`RESET ROLE; DELETE FROM auth.users WHERE id='${another}';`);
        assert.equal(await count(second.id),0); // Account deletion removes its vote.
        await db.query('UPDATE app_feedback SET is_hidden=true WHERE id=$1',[third.id]);
        await asUser(voter);
        assert.equal((await db.query('SELECT id FROM app_feedback WHERE id=$1',[third.id])).rows.length,0);
        await assert.rejects(db.query('INSERT INTO app_feedback_votes(feedback_id) VALUES($1)',[third.id]),/row-level security/);
        await db.exec(`RESET ROLE; UPDATE apps SET is_public=false WHERE id='${app}'; SET ROLE authenticated;`);
        assert.equal((await db.query('SELECT * FROM app_feedback')).rows.length,0);
        assert.equal((await db.query('SELECT * FROM app_feedback_votes')).rows.length,0);
        await assert.rejects(insert(),/row-level security/);
        await db.exec(`RESET ROLE; UPDATE apps SET is_public=true WHERE id='${app}'; SET ROLE anon;`);
        assert.equal((await db.query('SELECT id FROM app_feedback')).rows.length,2);
        await assert.rejects(db.exec('SELECT * FROM app_feedback_votes'),/permission denied/);
    } finally {await db.close();}
});
