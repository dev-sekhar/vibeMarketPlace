import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { MessageSquareQuote } from 'lucide-react';
import { useVibeAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { publicName } from '../../lib/articlePolicy';
import { citationError, RECOMMENDATIONS } from '../../lib/citations';
import { citationSaveError } from '../../lib/citationLanguage';
import type { Citation, CitationDraft } from '../../lib/citations';
import styles from './AppCitations.module.css';

interface Props { appId: string; creatorId: string; slug: string }
const pageSize = 20;
const emptyDraft = (user: User | null): CitationDraft => ({
  display_name: publicName(user?.user_metadata?.full_name, user?.user_metadata?.name, user?.user_metadata?.user_name),
  use_case: '', feedback: '', recommendation: '', evidence_url: '', has_used: false,
});

export function AppCitations(props: Props) {
  const { user, loading } = useVibeAuth();
  if (loading) return <section className={styles.section}><h2>Citations & recommendations</h2><p>Loading…</p></section>;
  return <CitationPanel key={`${props.appId}:${user?.id || 'guest'}`} {...props} user={user} />;
}

function CitationPanel({ appId, creatorId, slug, user }: Props & { user: User | null }) {
  const [items, setItems] = useState<Citation[]>([]);
  const [own, setOwn] = useState<Citation | null>(null);
  const [draft, setDraft] = useState<CitationDraft>(() => emptyDraft(user));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const alive = useRef(true);
  const request = useRef(0);
  const mutation = useRef(false);
  const userId = user?.id;

  const refresh = useCallback(async () => {
    const version = ++request.current;
    try {
      const [publicResult, ownResult] = await Promise.all([
        supabase.from('app_citations').select('*', { count: 'exact' }).eq('app_id', appId).eq('is_hidden', false)
          .order('created_at', { ascending: false }).order('id').range(0, pageSize - 1),
        userId ? supabase.from('app_citations').select('*').eq('app_id', appId).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (publicResult.error || ownResult.error) throw new Error('Load failed');
      if (!alive.current || version !== request.current) return;
      setItems(publicResult.data || []);
      setTotal(publicResult.count || 0);
      const mine = ownResult.data as Citation | null;
      setOwn(mine);
      if (mine) setDraft({ display_name: mine.display_name, use_case: mine.use_case, feedback: mine.feedback, recommendation: mine.recommendation, evidence_url: mine.evidence_url || '', has_used: mine.has_used });
      setLoadError(false);
    } catch {
      if (alive.current && version === request.current) setLoadError(true);
    } finally {
      if (alive.current && version === request.current) setLoading(false);
    }
  }, [appId, userId]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => { alive.current = false; };
  }, [refresh]);

  const loadMore = async () => {
    if (moreLoading) return;
    setMoreLoading(true); setError('');
    const version = request.current;
    try {
      const result = await supabase.from('app_citations').select('*').eq('app_id', appId).eq('is_hidden', false)
        .order('created_at', { ascending: false }).order('id').range(items.length, items.length + pageSize - 1);
      if (result.error) throw result.error;
      if (alive.current && version === request.current) setItems(previous => {
        const combined = new Map(previous.map(item => [item.id, item]));
        for (const item of result.data || []) combined.set(item.id, item);
        return [...combined.values()];
      });
    } catch { if (alive.current) setError('More citations could not be loaded. Please try again.'); }
    finally { if (alive.current) setMoreLoading(false); }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || mutation.current) return;
    const validation = citationError(draft);
    if (validation) { setError(validation); return; }
    mutation.current = true; setBusy(true); setError(''); setMessage('');
    const payload = { ...draft, display_name: draft.display_name.trim(), use_case: draft.use_case.trim(), feedback: draft.feedback.trim(), evidence_url: draft.evidence_url.trim() || null };
    try {
      const result = own
        ? await supabase.from('app_citations').update(payload).eq('id', own.id).eq('user_id', user.id).select('*').single()
        : await supabase.from('app_citations').insert({ ...payload, app_id: appId }).select('*').single();
      if (result.error) {
        setError(citationSaveError(result.error));
        return;
      }
      setMessage(own ? 'Your citation has been updated.' : 'Your citation has been published. Thank you for sharing your experience.');
      await refresh();
    } catch { setError('Your citation could not be saved. Please try again.'); }
    finally { mutation.current = false; if (alive.current) setBusy(false); }
  };

  const remove = async () => {
    if (!user || !own || mutation.current) return;
    mutation.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await supabase.from('app_citations').delete().eq('id', own.id).eq('user_id', user.id).select('id');
      if (result.error || !result.data?.length) throw new Error('Delete failed');
      setConfirmDelete(false); setOwn(null); setDraft(emptyDraft(user)); setMessage('Your citation has been removed.');
      await refresh();
    } catch { setError('Your citation could not be removed. Please try again.'); }
    finally { mutation.current = false; if (alive.current) setBusy(false); }
  };

  return <section className={styles.section} aria-labelledby="citations-title">
    <h2 id="citations-title"><MessageSquareQuote size={24} aria-hidden="true" /> Citations & recommendations</h2>
    <p className={styles.intro}>Used this app? Describe what you used it for, what worked, and what could improve. You can also link to a project or write-up that uses it.</p>
    <p className={styles.note}>Experiences are shared by users and are not independently verified. One citation per account per app; you can edit yours later.</p>
    {loading ? <p role="status">Loading citations…</p> : loadError ? <div role="alert"><p>Citations are temporarily unavailable. Please try again.</p><button onClick={() => { setLoading(true); void refresh(); }}>Retry</button></div> : <>
      {!user && <Link className={styles.login} to={`/login?next=${encodeURIComponent(`/app/${slug}`)}`}>Sign in to add your experience</Link>}
      {user?.id === creatorId && <p className={styles.note}>This section is for people who have used your app. Creators cannot submit a citation for their own app.</p>}
      {user && user.id !== creatorId && <form className={styles.form} onSubmit={save}>
        <h3>{own ? 'Your citation' : 'Share your experience'}</h3>
        <p className={styles.note}>Honest criticism is welcome. Keep your public name, use case and feedback free of profanity; describe the issue and how it could improve.</p>
        {own?.is_hidden && <p className={styles.note}>Your citation is hidden by a moderator. Edits remain hidden until reviewed.</p>}
        <label>Public name<input required minLength={2} maxLength={100} autoComplete="name" value={draft.display_name} onChange={e => setDraft({ ...draft, display_name: e.target.value })} /></label>
        <label>How did you use this app?<textarea required minLength={20} maxLength={500} rows={3} placeholder="Describe the task or project where you used it (20–500 characters)." value={draft.use_case} onChange={e => setDraft({ ...draft, use_case: e.target.value })} /></label>
        <label>Your feedback and recommendations<textarea required minLength={30} maxLength={2000} rows={5} placeholder="What worked well? What should others know? What could improve? (30–2,000 characters)" value={draft.feedback} onChange={e => setDraft({ ...draft, feedback: e.target.value })} /></label>
        <label>Would you recommend it?<select required value={draft.recommendation} onChange={e => setDraft({ ...draft, recommendation: e.target.value })}><option value="">Choose one</option>{Object.entries(RECOMMENDATIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Project or write-up link (optional)<input type="url" maxLength={2048} placeholder="https://…" value={draft.evidence_url} onChange={e => setDraft({ ...draft, evidence_url: e.target.value })} /></label>
        <label className={styles.confirm}><input type="checkbox" required checked={draft.has_used} onChange={e => setDraft({ ...draft, has_used: e.target.checked })} />I have personally used this app and am sharing an honest account of my experience.</label>
        <div className={styles.actions}><button className={styles.primary} disabled={busy || !draft.has_used} type="submit">{busy ? 'Saving…' : own ? 'Update citation' : 'Publish citation'}</button>
          {own && <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>Remove my citation</button>}
        </div>
        {confirmDelete && <div><p>Remove your citation? This cannot be undone.</p><div className={styles.actions}><button type="button" disabled={busy} onClick={() => void remove()}>Yes, remove it</button><button type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep citation</button></div></div>}
      </form>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}
      <h3>{total ? `${total} community ${total === 1 ? 'citation' : 'citations'}` : 'No citations yet'}</h3>
      {!total && <p className={styles.note}>Be the first to share how this app helped you.</p>}
      {items.map(item => <article key={item.id} className={styles.card}>
        <header><strong>{publicName(item.display_name) || 'Community member'}</strong><span className={styles.recommendation}>{RECOMMENDATIONS[item.recommendation as keyof typeof RECOMMENDATIONS]}</span></header>
        <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString()}{item.updated_at !== item.created_at ? ' · Edited' : ''}</time>
        <h4>How I used it</h4><p>{item.use_case}</p>
        <h4>My experience</h4><p>{item.feedback}</p>
        {item.evidence_url && /^https:\/\//.test(item.evidence_url) && <a href={item.evidence_url} target="_blank" rel="noopener noreferrer nofollow ugc">View project or write-up ↗</a>}
      </article>)}
      {items.length < total && <button disabled={moreLoading || busy} onClick={() => void loadMore()}>{moreLoading ? 'Loading…' : 'Load more citations'}</button>}
    </>}
  </section>;
}
