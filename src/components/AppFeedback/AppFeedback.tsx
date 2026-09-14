import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowUp, MessageSquarePlus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVibeAuth } from '../../context/AuthContext';
import { publicName } from '../../lib/articlePolicy';
import { FEEDBACK_KINDS, FEEDBACK_STATUSES, FEEDBACK_PAGE_SIZE, feedbackError, feedbackSaveError } from '../../lib/appFeedback';
import type { AppFeedbackItem, FeedbackDraft } from '../../lib/appFeedback';
import styles from './AppFeedback.module.css';

interface Props { appId:string; creatorId:string; slug:string }
export function AppFeedback(props:Props) {
    const {user,loading}=useVibeAuth();
    const {t}=useTranslation();
    if (loading) return <section className={styles.section}><h2>{t('feedback.title')}</h2><p>{t('feedback.loading')}</p></section>;
    return <FeedbackBoard key={`${props.appId}:${user?.id ?? 'guest'}`} {...props} user={user} />;
}

export function FeedbackBoard({appId,creatorId,slug,user}:Props & {user:User|null}) {
    const {t}=useTranslation();
    const [items,setItems]=useState<AppFeedbackItem[]>([]);
    const [votes,setVotes]=useState<Set<string>>(new Set());
    const [total,setTotal]=useState(0);
    const [page,setPage]=useState(0);
    const [kind,setKind]=useState('all');
    const [status,setStatus]=useState('all');
    const [showForm,setShowForm]=useState(false);
    const [draft,setDraft]=useState<FeedbackDraft>({display_name:publicName(user?.user_metadata?.full_name,user?.user_metadata?.name,user?.user_metadata?.user_name),kind:'bug',title:'',description:''});
    const [loading,setLoading]=useState(true);
    const [loadError,setLoadError]=useState(false);
    const [error,setError]=useState('');
    const [message,setMessage]=useState('');
    const [busy,setBusy]=useState(false);
    const alive=useRef(true);
    const version=useRef(0);
    const mutation=useRef(false);
    const userId=user?.id;
    const isOwner=userId===creatorId;

    const refresh=useCallback(async () => {
        const request=++version.current;
        setLoading(true);
        try {
            let query=supabase.from('app_feedback').select('*',{count:'exact'}).eq('app_id',appId).eq('is_hidden',false);
            if(kind!=='all') query=query.eq('kind',kind);
            if(status!=='all') query=query.eq('status',status);
            const result=await query.order('vote_count',{ascending:false}).order('created_at',{ascending:false}).order('id').range(page*FEEDBACK_PAGE_SIZE,(page+1)*FEEDBACK_PAGE_SIZE-1);
            if(result.error) throw result.error;
            const rows=(result.data ?? []) as AppFeedbackItem[];
            const ownVotes=userId && rows.length ? await supabase.from('app_feedback_votes').select('feedback_id').eq('user_id',userId).in('feedback_id',rows.map(row=>row.id)) : {data:[],error:null};
            if(ownVotes.error) throw ownVotes.error;
            if(!alive.current || request!==version.current) return;
            if(page>0 && !rows.length && (result.count ?? 0)<=page*FEEDBACK_PAGE_SIZE) { setPage(Math.max(0,Math.ceil((result.count ?? 0)/FEEDBACK_PAGE_SIZE)-1)); return; }
            setItems(rows); setTotal(result.count ?? 0); setVotes(new Set((ownVotes.data ?? []).map(row=>row.feedback_id))); setLoadError(false);
        } catch { if(alive.current && request===version.current) setLoadError(true); }
        finally { if(alive.current && request===version.current) setLoading(false); }
    },[appId,userId,page,kind,status]);
    useEffect(()=>{
        const requests=version;
        alive.current=true;
        void refresh();
        return ()=>{alive.current=false; requests.current++;};
    },[refresh]);

    const perform=async (operation:()=>PromiseLike<{error:{message?:string;code?:string}|null}>, successKey:string) => {
        if(mutation.current) return false;
        mutation.current=true; setBusy(true); setError(''); setMessage('');
        try {
            const result=await operation();
            if(result.error) throw result.error;
            if(!alive.current) return false;
            setMessage(successKey); await refresh(); return true;
        } catch(cause) {
            if(alive.current) setError(feedbackSaveError(cause && typeof cause==='object' ? cause : {}));
            return false;
        } finally { mutation.current=false; if(alive.current) setBusy(false); }
    };
    const save=async (event:FormEvent) => {
        event.preventDefault();
        if(!user || mutation.current) return;
        const validation=feedbackError(draft);
        if(validation){setError(validation);return;}
        const saved=await perform(()=>supabase.from('app_feedback').insert({app_id:appId,...draft,display_name:draft.display_name.trim(),title:draft.title.trim(),description:draft.description.trim()}).select('id').single(),'feedback.saved');
        if(saved && alive.current){setShowForm(false);setDraft(previous=>({...previous,title:'',description:''}));setPage(0);setKind('all');setStatus('all');}
    };
    const vote=async (item:AppFeedbackItem) => {
        if(!user || item.user_id===user.id) return;
        await perform(()=>votes.has(item.id)
            ? supabase.from('app_feedback_votes').delete().eq('feedback_id',item.id).eq('user_id',user.id)
            : supabase.from('app_feedback_votes').insert({feedback_id:item.id}), 'feedback.voteSaved');
    };
    const changeStatus=async (item:AppFeedbackItem,next:string) => {
        if(!isOwner) return;
        await perform(()=>supabase.from('app_feedback').update({status:next}).eq('id',item.id).eq('app_id',appId).select('id').single(),'feedback.statusSaved');
    };

    return <section className={styles.section} aria-labelledby="app-feedback-heading">
        <h2 id="app-feedback-heading"><MessageSquarePlus size={24}/>{t('feedback.title')}</h2>
        <p className={styles.note}>{t('feedback.intro')}</p>
        <p className={styles.note}>{t(isOwner?'feedback.ownerRanking':'feedback.ranking')}</p>
        <div className={styles.toolbar}>
            {user ? <button type="button" disabled={busy || loading || loadError} onClick={()=>setShowForm(!showForm)}>{t(showForm?'feedback.cancel':'feedback.add')}</button> : <Link to={`/login?next=${encodeURIComponent(`/app/${slug}`)}`}>{t('feedback.login')}</Link>}
            <button type="button" disabled={busy || loading} onClick={()=>void refresh()}>{t('feedback.refresh')}</button>
        </div>
        {showForm && <form onSubmit={save} className={styles.form}>
            <fieldset disabled={busy}>
            <p className={styles.note}>{t('feedback.rules')}</p>
            <label>{t('feedback.name')}<input required minLength={2} maxLength={100} value={draft.display_name} onChange={event=>setDraft({...draft,display_name:event.target.value})}/></label>
            <label>{t('feedback.kind')}<select value={draft.kind} onChange={event=>setDraft({...draft,kind:event.target.value})}>{FEEDBACK_KINDS.map(value=><option key={value} value={value}>{t(`feedback.kinds.${value}`)}</option>)}</select></label>
            <label>{t('feedback.summary')}<input required minLength={5} maxLength={120} value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})}/></label>
            <label>{t('feedback.description')}<textarea required minLength={30} maxLength={3000} rows={5} value={draft.description} placeholder={t(`feedback.hints.${draft.kind}`)} onChange={event=>setDraft({...draft,description:event.target.value})}/></label>
            <button type="submit" disabled={busy}>{t(busy?'feedback.saving':'feedback.publish')}</button>
            </fieldset>
        </form>}
        {error && <p className={styles.error} role="alert">{t(error)}</p>}
        {message && <p className={styles.success} role="status">{t(message)}</p>}
        <div className={styles.filters}>
            <label>{t('feedback.kind')}<select disabled={busy} value={kind} onChange={event=>{setKind(event.target.value);setPage(0);}}><option value="all">{t('feedback.all')}</option>{FEEDBACK_KINDS.map(value=><option key={value} value={value}>{t(`feedback.kinds.${value}`)}</option>)}</select></label>
            <label>{t('feedback.status')}<select disabled={busy} value={status} onChange={event=>{setStatus(event.target.value);setPage(0);}}><option value="all">{t('feedback.all')}</option>{FEEDBACK_STATUSES.map(value=><option key={value} value={value}>{t(`feedback.statuses.${value}`)}</option>)}</select></label>
        </div>
        {loading ? <p role="status">{t('feedback.loading')}</p> : loadError ? <p className={styles.error} role="alert">{t('feedback.errors.load')}</p> : <>
            <p className={styles.note}>{t('feedback.count',{count:total})}</p>
            {!items.length && <p>{t('feedback.empty')}</p>}
            {items.map(item=><article key={item.id} className={styles.card}>
                <div className={styles.cardHeader}><span>{t(`feedback.kinds.${item.kind}`)}</span><span>{t(`feedback.statuses.${item.status}`)}</span></div>
                <h3>{item.title}</h3><p className={styles.description}>{item.description}</p>
                <p className={styles.byline}>{publicName(item.display_name)||t('feedback.community')} · <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString()}</time></p>
                <div className={styles.toolbar}>
                    <button type="button" aria-pressed={votes.has(item.id)} aria-label={t(votes.has(item.id)?'feedback.removeVote':'feedback.voteFor',{title:item.title,count:item.vote_count})} disabled={!user || item.user_id===userId || busy} onClick={()=>void vote(item)}><ArrowUp size={16}/>{item.vote_count} · {t(votes.has(item.id)?'feedback.voted':'feedback.vote')}</button>
                    {item.user_id===userId && <span className={styles.note}>{t('feedback.own')}</span>}
                    {isOwner && <label>{t('feedback.ownerStatus')}<select disabled={busy} value={item.status} onChange={event=>void changeStatus(item,event.target.value)}>{FEEDBACK_STATUSES.map(value=><option key={value} value={value}>{t(`feedback.statuses.${value}`)}</option>)}</select></label>}
                </div>
            </article>)}
            {total>FEEDBACK_PAGE_SIZE && <nav className={styles.toolbar} aria-label={t('feedback.pages')}>
                <button type="button" disabled={!page || busy} onClick={()=>setPage(page-1)}>{t('feedback.previous')}</button>
                <span>{t('feedback.page',{page:page+1,total:Math.ceil(total/FEEDBACK_PAGE_SIZE)})}</span>
                <button type="button" disabled={(page+1)*FEEDBACK_PAGE_SIZE>=total || busy} onClick={()=>setPage(page+1)}>{t('feedback.next')}</button>
            </nav>}
        </>}
    </section>;
}
